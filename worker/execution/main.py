#!/usr/bin/env python3
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

from routing.agent_graph import AgentGraph

RUN_LOG = Path("/opt/ai/logs/orchestrator-runs.jsonl")
RUN_LOG.parent.mkdir(parents=True, exist_ok=True)

def sanitize_text(text: str) -> str:
    text = text.replace("\r\n", "\n")

    pattern = re.compile(r'\[([^\]]+)\]\((https?://[^)]+)\)')
    prev = None
    while prev != text:
        prev = text
        text = pattern.sub(r'\2', text)

    return text.strip()


def sanitize_result(result: dict) -> dict:
    cleaned = dict(result)

    if cleaned["mode"] == "handoff":
        cleaned["plan"] = dict(cleaned["plan"])
        cleaned["research"] = dict(cleaned["research"])
        cleaned["plan"]["response"] = sanitize_text(cleaned["plan"]["response"])
        cleaned["research"]["response"] = sanitize_text(cleaned["research"]["response"])
    else:
        cleaned["result"] = dict(cleaned["result"])
        cleaned["result"]["response"] = sanitize_text(cleaned["result"]["response"])

    return cleaned

def write_run_log(record: dict):
    with RUN_LOG.open("a", encoding="utf-8") as f:
        f.write(json.dumps(record, ensure_ascii=False) + "\n")

def main():
    if len(sys.argv) < 2:
        print('Usage: python orchestrator/main.py <planner|research|auto|handoff> "your prompt"')
        sys.exit(1)

    mode = sys.argv[1].strip().lower()
    prompt = " ".join(sys.argv[2:]).strip()

    if mode not in {"planner", "research", "auto", "handoff"}:
        print("ERROR: mode must be planner, research, auto, or handoff")
        sys.exit(1)

    if not prompt:
        print("ERROR: prompt required")
        sys.exit(1)

    try:
        graph = AgentGraph()
        raw_result = graph.run(mode, prompt)
        result = sanitize_result(raw_result)

        log_record = {
            "ts": datetime.now(timezone.utc).isoformat(),
            **result,
        }
        write_run_log(log_record)

        print(f"[{result['mode']}]")
        if result["mode"] == "handoff":
            print("PLAN:")
            print(result["plan"]["response"])
            print()
            print("RESEARCH:")
            print(result["research"]["response"])
        else:
            print(f"[{result['selected_role']}]")
            print(result["result"]["response"])

    except Exception as exc:
        print("ERROR:", exc)
        sys.exit(1)

if __name__ == "__main__":
    main()
