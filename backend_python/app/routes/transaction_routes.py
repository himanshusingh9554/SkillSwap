from fastapi import APIRouter, HTTPException, status, Depends
from app.models.transaction import TransactionInitiateRequest
from app.database import get_db, to_object_id, serialize_doc
from app.middleware.auth import get_current_user
from app.services.notification_service import create_notification
from datetime import datetime

router = APIRouter(prefix="/api/v1/transactions", tags=["Transactions"])

@router.post("/initiate", status_code=status.HTTP_201_CREATED)
async def initiate_transaction(body: TransactionInitiateRequest, current_user: dict = Depends(get_current_user)):
    db = get_db()
    skill_id = to_object_id(body.skillId)
    if not skill_id:
        raise HTTPException(status_code=400, detail="Invalid skill ID format")

    skill = await db.skills.find_one({"_id": skill_id})
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")

    seeker_id = to_object_id(current_user["_id"])
    provider_id = skill["owner"]

    if str(provider_id) == str(seeker_id):
        raise HTTPException(status_code=400, detail="You cannot request your own skill")

    seeker = await db.users.find_one({"_id": seeker_id})
    if not seeker or seeker.get("credits", 0) < skill.get("credits", 0):
        raise HTTPException(status_code=400, detail="Insufficient credits")

    now = datetime.utcnow()
    new_tx = {
        "skill": skill_id,
        "seeker": seeker_id,
        "provider": provider_id,
        "credits": skill.get("credits", 0),
        "status": "pending",
        "createdAt": now,
        "updatedAt": now
    }
    res = await db.transactions.insert_one(new_tx)
    new_tx["_id"] = res.inserted_id

    # Create notification for provider
    seeker_name = seeker.get("fullName", "A user")
    skill_title = skill.get("title", "Skill")
    await create_notification(
        user_id=provider_id,
        notif_type="TRANSACTION",
        content=f"{seeker_name} has requested your skill: \"{skill_title}\"",
        related_id=new_tx["_id"],
        type_ref="Transaction"
    )

    return {
        "message": "Transaction initiated successfully. Waiting for provider's approval.",
        "transaction": serialize_doc(new_tx)
    }

@router.patch("/accept/{transactionId}")
async def accept_transaction(transactionId: str, current_user: dict = Depends(get_current_user)):
    tx_id = to_object_id(transactionId)
    if not tx_id:
        raise HTTPException(status_code=400, detail="Invalid transaction ID format")

    db = get_db()
    tx = await db.transactions.find_one({"_id": tx_id})
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    if str(tx["provider"]) != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="Forbidden: Only the skill provider can accept this transaction")

    if tx.get("status") != "pending":
        raise HTTPException(status_code=400, detail=f"Cannot accept a transaction with status: {tx.get('status')}")

    now = datetime.utcnow()
    await db.transactions.update_one(
        {"_id": tx_id},
        {"$set": {"status": "accepted", "updatedAt": now}}
    )
    updated_tx = await db.transactions.find_one({"_id": tx_id})
    return {
        "message": "Transaction accepted successfully",
        "transaction": serialize_doc(updated_tx)
    }

@router.patch("/complete/{transactionId}")
async def complete_transaction(transactionId: str, current_user: dict = Depends(get_current_user)):
    tx_id = to_object_id(transactionId)
    if not tx_id:
        raise HTTPException(status_code=400, detail="Invalid transaction ID format")

    db = get_db()
    tx = await db.transactions.find_one({"_id": tx_id})
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    if str(tx["seeker"]) != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="Forbidden: Only the skill seeker can complete this transaction")

    if tx.get("status") != "accepted":
        raise HTTPException(status_code=400, detail=f"Cannot complete a transaction with status: {tx.get('status')}")

    credits = tx.get("credits", 0)
    # Transfer credits
    await db.users.update_one({"_id": tx["seeker"]}, {"$inc": {"credits": -credits}})
    await db.users.update_one({"_id": tx["provider"]}, {"$inc": {"credits": credits}})

    now = datetime.utcnow()
    await db.transactions.update_one(
        {"_id": tx_id},
        {"$set": {"status": "completed", "updatedAt": now}}
    )
    updated_tx = await db.transactions.find_one({"_id": tx_id})
    return {
        "message": "Transaction completed successfully! Credits have been transferred.",
        "transaction": serialize_doc(updated_tx)
    }

@router.patch("/cancel/{transactionId}")
async def cancel_transaction(transactionId: str, current_user: dict = Depends(get_current_user)):
    tx_id = to_object_id(transactionId)
    if not tx_id:
        raise HTTPException(status_code=400, detail="Invalid transaction ID format")

    db = get_db()
    tx = await db.transactions.find_one({"_id": tx_id})
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    user_id_str = str(current_user["_id"])
    if str(tx["seeker"]) != user_id_str and str(tx["provider"]) != user_id_str:
        raise HTTPException(status_code=403, detail="Forbidden: You are not part of this transaction")

    if tx.get("status") not in ["pending", "accepted"]:
        raise HTTPException(status_code=400, detail=f"Cannot cancel a transaction with status: {tx.get('status')}")

    now = datetime.utcnow()
    await db.transactions.update_one(
        {"_id": tx_id},
        {"$set": {"status": "cancelled", "updatedAt": now}}
    )
    updated_tx = await db.transactions.find_one({"_id": tx_id})
    return {
        "message": "Transaction cancelled successfully",
        "transaction": serialize_doc(updated_tx)
    }

@router.get("/my-transactions")
async def get_my_transactions(current_user: dict = Depends(get_current_user)):
    db = get_db()
    user_obj_id = to_object_id(current_user["_id"])

    cursor = db.transactions.find({
        "$or": [{"seeker": user_obj_id}, {"provider": user_obj_id}]
    }).sort("createdAt", -1)
    txs = await cursor.to_list(length=200)

    populated_txs = []
    for tx in txs:
        # Populate skill
        skill = await db.skills.find_one({"_id": tx.get("skill")}, {"title": 1})
        tx["skill"] = {"_id": str(tx.get("skill")), "title": skill.get("title", "Skill")} if skill else {"title": "Deleted Skill"}

        # Populate seeker
        seeker = await db.users.find_one({"_id": tx.get("seeker")}, {"fullName": 1})
        tx["seeker"] = {"_id": str(tx.get("seeker")), "fullName": seeker.get("fullName", "User")} if seeker else {"fullName": "User"}

        # Populate provider
        provider = await db.users.find_one({"_id": tx.get("provider")}, {"fullName": 1})
        tx["provider"] = {"_id": str(tx.get("provider")), "fullName": provider.get("fullName", "User")} if provider else {"fullName": "User"}

        populated_txs.append(serialize_doc(tx))

    return {
        "message": "Transactions fetched successfully",
        "transactions": populated_txs
    }
