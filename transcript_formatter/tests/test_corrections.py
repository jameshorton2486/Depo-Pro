from __future__ import annotations

from pipeline.block_builder import build_blocks_from_text
from spec_engine.corrections import apply_corrections
from spec_engine.models import Block, BlockType


def _make_block(text: str, role: str = "THE WITNESS", speaker_role: str = "WITNESS") -> Block:
    return Block(
        text=text,
        raw_text=text,
        speaker_id=0,
        speaker_name=role,
        speaker_role=speaker_role,
        block_type=BlockType.ANSWER,
    )


def _correct(text: str, role: str = "THE WITNESS", speaker_role: str = "WITNESS") -> Block:
    block = _make_block(text, role=role, speaker_role=speaker_role)
    return apply_corrections(
        [block],
        {"speaker_map": {0: role}, "cause_number": "TEST-001"},
    )[0]


def test_verbatim_fillers_preserved():
    assert "uh" in _correct("I, uh, think so.").text.lower()
    assert "um" in _correct("Um, that is correct.").text.lower()
    assert "yeah" in _correct("Yeah, I went there.").text.lower()
    assert "nope" in _correct("Nope, I did not.").text.lower()
    assert "uh-huh" in _correct("Uh-huh, that's right.").text.lower()
    assert "mm-hmm" in _correct("Mm-hmm.").text.lower()


def test_duplicate_artifact_collapsed_but_affirmation_preserved():
    assert _correct("Corrected Corrected").text == "Corrected"
    assert "correct correct" in _correct("correct correct").text.lower()


def test_time_dash_reporter_and_spacing_normalize():
    assert "9:00 a.m." in _correct("The time is 09:00 AM.").text
    assert "--" in _correct("He said — no.").text
    assert _correct("THE COURT REPORTER: Please state your name.").text.startswith("THE REPORTER:")
    assert "Done.  Next question." == _correct("Done. Next question.").text


def test_apply_corrections_preserves_structure_fields():
    original = _make_block("The time is 10:30 AM.", role="MR. SMITH", speaker_role="ATTORNEY")
    corrected = apply_corrections([original], {"speaker_map": {0: "MR. SMITH"}, "cause_number": "X"})[0]
    assert corrected.block_type == BlockType.ANSWER
    assert corrected.speaker_name == "MR. SMITH"
    assert corrected.speaker_role == "ATTORNEY"
    assert "corrections" in corrected.meta


def test_build_blocks_from_text_respects_abbreviation_guard():
    blocks = build_blocks_from_text("Dr. Smith testified. He left.")
    assert len(blocks) == 2
    assert blocks[0].text == "Dr. Smith testified."
    assert blocks[1].text == "He left."

