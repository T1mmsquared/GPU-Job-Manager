import json
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

import requests
import yaml


@dataclass
class ResearchConfig:
    name: str
    role: str
    model: str
    endpoint: str
    timeout_seconds: int
    log_file: str
    default_prompt: str


class ResearchAgent:
    def __init__(self, config_path: str):
        self.config = self._load_config(config_path)
        self.log_path = Path(self.config.log_file)
        self.log_path.parent.mkdir(parents=True, exist_ok=True)

    def _load_config(self, config_path: str) -> ResearchConfig:
        with open(config_path, "r", encoding="utf-8") as f:
            raw = yaml.safe_load(f)

        return ResearchConfig(
            name=raw["name"],
            role=raw["role"],
            model=raw["model"],
            endpoint=raw["endpoint"],
            timeout_seconds=raw["timeout_seconds"],
            log_file=raw["log_file"],
            default_prompt=raw["default_prompt"],
        )

    def generate(self, prompt: str) -> dict:
        full_prompt = f"{self.config.default_prompt}\n\nUser request:\n{prompt}"

        payload = {
            "model": self.config.model,
            "prompt": full_prompt,
            "stream": False,
            "options": {
                "temperature": 0.2,
                "num_predict": 180
            }
        }

        started = time.perf_counter()
        status_code = None
        response_json = None
        error = None

        try:
            response = requests.post(
                self.config.endpoint,
                json=payload,
                timeout=self.config.timeout_seconds,
            )
            status_code = response.status_code
            response.raise_for_status()
            response_json = response.json()
        except Exception as exc:
            error = str(exc)

        elapsed_ms = round((time.perf_counter() - started) * 1000, 2)

        record = {
            "ts": datetime.now(timezone.utc).isoformat(),
            "agent_name": self.config.name,
            "role": self.config.role,
            "model": self.config.model,
            "endpoint": self.config.endpoint,
            "prompt": prompt,
            "status_code": status_code,
            "elapsed_ms": elapsed_ms,
            "error": error,
            "response": response_json,
        }

        with self.log_path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")

        return record
