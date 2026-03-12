import time
import requests

from planner_agent import PlannerAgent
from research_agent import ResearchAgent

PLANNER_CONFIG = "config/agents/planner.yaml"
RESEARCH_CONFIG = "config/agents/research.yaml"

HEALTH_URLS = {
    "planner": "http://127.0.0.1:11434/api/tags",
    "research": "http://127.0.0.1:11435/api/tags",
}

ENV_FACTS = """
Environment facts:
- Host is a local Linux machine running multiple Ollama services.
- Planner service endpoint: http://127.0.0.1:11434
- Research service endpoint: http://127.0.0.1:11435
- Planner is pinned to GPU0.
- Research is pinned to GPU2.
- Logs are stored under /opt/ai/logs

Validated local commands and patterns:
- Check planner service health:
  curl http://127.0.0.1:11434/api/tags
- Check research service health:
  curl http://127.0.0.1:11435/api/tags
- Test text generation on planner or research service:
  curl http://127.0.0.1:11435/api/generate -d '{
    "model": "qwen2.5:7b",
    "prompt": "Reply with exactly four words.",
    "stream": false
  }'
- Check planner systemd unit:
  systemctl status ollama
- Check research systemd unit:
  systemctl status ollama-research
- Check recent service logs:
  journalctl -u ollama -n 50 --no-pager
  journalctl -u ollama-research -n 50 --no-pager
- Check GPU placement and utilization:
  nvidia-smi

Rules:
- Use only the validated endpoints and commands above unless the task explicitly asks for something else.
- Do not invent endpoints such as /api/inference.
- Do not invent request fields such as input when generate uses prompt.
- Do not invent ports, remote hosts, SSH steps, ping, or traceroute unless explicitly requested.
"""


PLANNER_HINT = """
You are the planner agent for League of Doom.
Return short operational plans for local setup, validation, services, ports, logs, and GPU checks.
Prefer concrete local commands and validation steps.
Do not use markdown headings.
Do not explain your reasoning.
Keep responses under 6 lines.
"""

RESEARCH_HINT = """
You are the research agent for League of Doom.
Return concise factual summaries and implementation guidance for local LLM serving, GPU constraints,
model fit, validation methods, and deployment tradeoffs.
Do not repeat operational steps unless explicitly asked.
Focus on rationale, tradeoffs, fit, and constraints.
Do not use markdown headings.
Do not explain your reasoning.
Keep responses under 6 lines.
"""

class AgentGraph:
    def __init__(self):
        self.planner = PlannerAgent(PLANNER_CONFIG)
        self.research = ResearchAgent(RESEARCH_CONFIG)

    def health_check(self, role: str):
        response = requests.get(HEALTH_URLS[role], timeout=10)
        response.raise_for_status()

    def choose_role(self, prompt: str) -> str:
        text = prompt.lower()

        planner_keywords = [
            "plan", "steps", "setup", "configure", "create", "build", "validate",
            "start", "stop", "restart", "systemd", "service", "port", "log",
            "latency", "gpu", "nvidia-smi", "ollama ps", "curl", "health check"
        ]
        research_keywords = [
            "summarize", "summary", "tradeoff", "compare", "comparison", "why",
            "pros", "cons", "difference", "best", "recommend", "explain",
            "fit", "model", "hardware", "constraint"
        ]

        planner_score = sum(1 for k in planner_keywords if k in text)
        research_score = sum(1 for k in research_keywords if k in text)

        return "planner" if planner_score >= research_score else "research"

    def build_prompt(self, role: str, prompt: str) -> str:
        if role == "planner":
            return f"{ENV_FACTS}\n{PLANNER_HINT}\nTask:\n{prompt}"
        return f"{ENV_FACTS}\n{RESEARCH_HINT}\nTask:\n{prompt}"

    def run_single(self, role: str, prompt: str):
        started = time.perf_counter()
        self.health_check(role)

        agent = self.planner if role == "planner" else self.research
        result = agent.generate(self.build_prompt(role, prompt))

        if result["error"]:
            raise RuntimeError(result["error"])

        elapsed_ms = round((time.perf_counter() - started) * 1000, 2)

        return {
            "role": role,
            "response": result["response"]["response"],
            "elapsed_ms": elapsed_ms,
        }

    def run(self, mode: str, prompt: str):
        if mode == "handoff":
            plan = self.run_single(
                "planner",
                f"Create a concise 3-step local execution plan for this task. "
                f"Use only validated local commands and endpoints from the environment facts. "
                f"Return steps only, with concrete local commands when useful:\n{prompt}"
            )


            research = self.run_single(
                "research",
                f"For this task:\n{prompt}\n\n"
                f"The planner already produced these execution steps:\n{plan['response']}\n\n"
                f"Do not repeat the steps. Instead, explain only the technical rationale, "
                f"tradeoffs, validation criteria, or model-fit considerations relevant to the task."
            )

            return {
                "mode": "handoff",
                "selected_role": "planner+research",
                "prompt": prompt,
                "plan": plan,
                "research": research,
            }

        role = self.choose_role(prompt) if mode == "auto" else mode
        result = self.run_single(role, prompt)

        return {
            "mode": mode,
            "selected_role": role,
            "prompt": prompt,
            "result": result,
        }
