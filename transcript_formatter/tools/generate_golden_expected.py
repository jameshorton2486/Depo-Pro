"""
Generate the expected output file for a golden transcript test.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from spec_engine.models import JobConfig
from spec_engine.parser import parse_blocks
from spec_engine.processor import process_blocks


def generate(input_docx: str, job_config_json: str, output_txt: str) -> None:
    cfg = JobConfig.from_json(Path(job_config_json).read_text(encoding="utf-8"))
    blocks = parse_blocks(input_docx)
    result = process_blocks(blocks, cfg)

    lines = []
    for block in result:
        block_type = block.block_type.value if hasattr(block.block_type, "value") else str(block.block_type)
        lines.append(f"{block_type}: {block.text}")

    Path(output_txt).write_text("\n".join(lines), encoding="utf-8")
    print(f"Written {len(lines)} block lines to {output_txt}")


if __name__ == "__main__":
    if len(sys.argv) != 4:
        print(__doc__)
        sys.exit(1)
    generate(sys.argv[1], sys.argv[2], sys.argv[3])
