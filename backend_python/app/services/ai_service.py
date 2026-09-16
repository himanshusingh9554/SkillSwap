import json
import logging
from typing import List, Dict, Any, Optional
from app.config import settings

logger = logging.getLogger("skillswap.ai")

# Try to configure Gemini
_gemini_client = None
if settings.GEMINI_API_KEY:
    try:
        import google.generativeai as genai
        genai.configure(api_key=settings.GEMINI_API_KEY)
        _gemini_client = genai.GenerativeModel("gemini-1.5-flash")
        logger.info("✅ Google Gemini AI client initialized successfully!")
    except Exception as e:
        logger.warning(f"Failed to initialize Gemini AI client: {e}. Running in smart fallback mode.")
else:
    logger.info("ℹ️ No GEMINI_API_KEY found in environment. Running AI service in smart mock/heuristic mode.")

async def enhance_skill_listing(title: str, rough_description: str, category: Optional[str] = None) -> Dict[str, Any]:
    """Uses Gen AI to generate professional title, detailed syllabus/description, prerequisites, and suggested credits."""
    if _gemini_client:
        prompt = f"""
        You are an expert curriculum designer and copywriter for a peer-to-peer skill swap platform called SkillSwap.
        Enhance the following skill proposal into an engaging, structured listing.

        User Input:
        - Title: {title}
        - Description: {rough_description}
        - Category: {category or "Auto-detect"}

        Return a strictly valid JSON object with the following structure:
        {{
            "title": "Clear, engaging title",
            "description": "Comprehensive, professional description highlighting what the learner will gain",
            "category": "One of Technology, Creative, Lifestyle, Business, Other",
            "skillType": "Offer",
            "credits": 25,
            "keyOutcomes": ["Outcome 1", "Outcome 2", "Outcome 3"],
            "prerequisites": ["Prerequisite 1", "None needed"]
        }}
        """
        try:
            response = _gemini_client.generate_content(prompt)
            text = response.text.strip()
            # Clean markdown codeblocks if present
            if text.startswith("```json"):
                text = text[7:]
            if text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]
            data = json.loads(text.strip())
            return data
        except Exception as e:
            logger.error(f"Gemini API error in enhance_skill_listing: {e}")

    # Smart Fallback
    cat = category if category in ["Technology", "Creative", "Lifestyle", "Business", "Other"] else "Technology"
    return {
        "title": title.title(),
        "description": f"Master {title}: {rough_description}. This hands-on exchange covers fundamental principles, real-world examples, and guided practice sessions tailored to your pace.",
        "category": cat,
        "skillType": "Offer",
        "credits": 20,
        "keyOutcomes": [
            f"Core fundamentals of {title}",
            "Practical exercises and hands-on guidance",
            "Custom feedback and next-step recommendations"
        ],
        "prerequisites": ["Open mindset and curiosity to learn"]
    }

async def generate_swap_roadmap(my_skill: str, partner_skill: str, weeks: int = 4) -> Dict[str, Any]:
    """Generates a structured multi-week swap curriculum between two users exchanging skills."""
    if _gemini_client:
        prompt = f"""
        You are an AI learning coordinator for SkillSwap.
        Generate a {weeks}-week structured bilateral skill swap roadmap between two learners:
        Learner A teaches: {my_skill}
        Learner B teaches: {partner_skill}

        Return a strictly valid JSON object:
        {{
            "summary": "High-level swap objective",
            "schedule": [
                {{
                    "week": 1,
                    "focus": "Theme of the week",
                    "sessionA": "What Learner A teaches Learner B",
                    "sessionB": "What Learner B teaches Learner A",
                    "milestone": "Goal to achieve together"
                }}
            ],
            "recommendedSessionMinutes": 60,
            "successTips": ["Tip 1", "Tip 2"]
        }}
        """
        try:
            response = _gemini_client.generate_content(prompt)
            text = response.text.strip()
            if text.startswith("```json"):
                text = text[7:]
            if text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]
            return json.loads(text.strip())
        except Exception as e:
            logger.error(f"Gemini API error in generate_swap_roadmap: {e}")

    # Fallback roadmap
    schedule = []
    for w in range(1, weeks + 1):
        schedule.append({
            "week": w,
            "focus": f"Week {w} Milestone & Integration",
            "sessionA": f"Session on {my_skill} fundamentals & practical application part {w}",
            "sessionB": f"Session on {partner_skill} fundamentals & practice exercise part {w}",
            "milestone": f"Demonstrate practical competence in Week {w} objectives"
        })

    return {
        "summary": f"A balanced {weeks}-week exchange between {my_skill} and {partner_skill}.",
        "schedule": schedule,
        "recommendedSessionMinutes": 60,
        "successTips": [
            "Set clear agendas before each session.",
            "Dedicate equal time to both skills.",
            "Work on a mini-project together to cement learnings."
        ]
    }

async def match_skills_with_ai(query: str, available_skills: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Uses Gen AI to match a user's prompt or requirements against available skills with compatibility scoring and explanations."""
    if not available_skills:
        return {"matches": [], "explanation": "No active skills available on the platform yet."}

    skills_summary = [
        {
            "id": str(s.get("_id", "")),
            "title": s.get("title", ""),
            "description": s.get("description", "")[:120],
            "category": s.get("category", ""),
            "skillType": s.get("skillType", ""),
            "credits": s.get("credits", 0),
            "owner": s.get("owner", {}).get("fullName", "User") if isinstance(s.get("owner"), dict) else "User"
        }
        for s in available_skills[:20]
    ]

    if _gemini_client:
        prompt = f"""
        You are SkillSwap's AI Matchmaker. A user is looking for skill swaps with this request:
        "{query}"

        Here is a list of available skills on the platform:
        {json.dumps(skills_summary, indent=2)}

        Analyze the request and pick the top 3-5 best matching skills.
        Return a strictly valid JSON object:
        {{
            "matches": [
                {{
                    "skillId": "the exact id from the list",
                    "matchScore": 95,
                    "reason": "Why this is an ideal swap match for the user"
                }}
            ],
            "aiAdvice": "Actionable advice on how to initiate the swap"
        }}
        """
        try:
            response = _gemini_client.generate_content(prompt)
            text = response.text.strip()
            if text.startswith("```json"):
                text = text[7:]
            if text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]
            parsed = json.loads(text.strip())

            # Merge matched details with skill documents
            matches_with_docs = []
            skill_map = {str(s.get("_id")): s for s in available_skills}
            for m in parsed.get("matches", []):
                sid = m.get("skillId")
                if sid in skill_map:
                    doc = dict(skill_map[sid])
                    doc["matchScore"] = m.get("matchScore", 80)
                    doc["matchReason"] = m.get("reason", "")
                    matches_with_docs.append(doc)

            return {
                "matches": matches_with_docs,
                "aiAdvice": parsed.get("aiAdvice", "Reach out to these providers to propose a swap!")
            }
        except Exception as e:
            logger.error(f"Gemini API error in match_skills_with_ai: {e}")

    # Fallback keyword matching
    query_lower = query.lower()
    matches = []
    for s in available_skills:
        score = 50
        title = s.get("title", "").lower()
        desc = s.get("description", "").lower()
        cat = s.get("category", "").lower()

        for word in query_lower.split():
            if len(word) > 2:
                if word in title:
                    score += 25
                elif word in desc or word in cat:
                    score += 15

        if score > 50:
            doc = dict(s)
            doc["matchScore"] = min(score, 99)
            doc["matchReason"] = f"Relevant match based on '{s.get('title')}' and category {s.get('category')}."
            matches.append(doc)

    matches.sort(key=lambda x: x.get("matchScore", 0), reverse=True)
    return {
        "matches": matches[:5],
        "aiAdvice": "These platform skills align well with your requested interests. Click 'Request Skill' to begin!"
    }

async def ai_tutor_chat(message: str, history: List[Dict[str, str]] = None) -> str:
    """Answers skill exchange questions, learning guidance, or platform navigation."""
    if _gemini_client:
        prompt = f"""
        You are the SkillSwap AI Coach & Tutor. SkillSwap is a community platform where people exchange knowledge without money, using skill credits (50 credits starting bonus).
        Help the user with their question:
        "{message}"
        Be friendly, encouraging, practical, and concise.
        """
        try:
            response = _gemini_client.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            logger.error(f"Gemini tutor error: {e}")

    return f"Great question about '{message}'! On SkillSwap, you can list your knowledge under 'Publish Skill' or browse skills offered by others. You earn credits when someone accepts your skill, and spend credits to learn from other community members!"
