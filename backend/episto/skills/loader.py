"""Skill loader with regex-based YAML frontmatter parsing.

Loads skill .md files from the skills directory, extracting metadata
from YAML frontmatter and the prompt content from the body.

Pattern follows DeerFlow's skills/parser.py but simplified:
- Single flat directory (not public/custom subdirectories)
- Filename-based lookup (not directory walk for SKILL.md)
- No category/enabled state management

Reference: DeerFlow backend/packages/harness/deerflow/skills/parser.py
"""

import logging
import re
from dataclasses import dataclass
from pathlib import Path

logger = logging.getLogger(__name__)

# Skills directory: backend/episto/skills/
SKILLS_DIR = Path(__file__).resolve().parent


@dataclass
class Skill:
    """A parsed skill with metadata and content.

    Attributes:
        name: Skill identifier (from frontmatter 'name' field).
        description: Short description (from frontmatter 'description' field).
        metadata: All frontmatter key-value pairs as a dict.
        content: The prompt body (everything after the closing ---).
        file_path: Absolute path to the .md source file.
    """

    name: str
    description: str
    metadata: dict
    content: str
    file_path: Path


def _parse_frontmatter(text: str) -> tuple[dict, str] | None:
    """Parse YAML frontmatter from markdown text using regex.

    DeerFlow uses ``re.match(r"^---\\s*\\n(.*?)\\n---\\s*\\n", content, re.DOTALL)``.
    We follow the same approach: no python-frontmatter dependency.

    Args:
        text: Raw .md file content.

    Returns:
        Tuple of (metadata_dict, body_content) if frontmatter found,
        None otherwise.
    """
    match = re.match(r"^---\s*\n(.*?)\n---\s*\n", text, re.DOTALL)
    if not match:
        return None

    frontmatter_text = match.group(1)
    body = text[match.end():]

    # Parse simple YAML key-value pairs.
    # DeerFlow's parser handles multiline (|, >) but our metadata
    # is flat strings and lists, so simple "key: value" suffices.
    metadata = {}
    current_key = None
    current_list = []

    for line in frontmatter_text.split("\n"):
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue

        # List item belonging to previous key
        if stripped.startswith("- "):
            if current_key is not None:
                current_list.append(stripped[2:].strip())
            continue

        # New key — flush any pending list
        if current_key is not None and current_list:
            metadata[current_key] = current_list
            current_key = None
            current_list = []

        if ":" in stripped:
            key, value = stripped.split(":", 1)
            key = key.strip()
            value = value.strip()

            if not value:
                # Empty value means the key has a list on following lines
                current_key = key
                current_list = []
            elif value.startswith("[") and value.endswith("]"):
                metadata[key] = [v.strip() for v in value[1:-1].split(",")]
            else:
                metadata[key] = value

    # Flush final pending list
    if current_key is not None and current_list:
        metadata[current_key] = current_list

    return metadata, body


class SkillLoader:
    """Load and parse skill .md files from the skills directory.

    Implements the Progressive Loading pattern:
    - list_skills() returns only name + description (for the Lead Agent)
    - load(name) returns the full Skill with prompt content (for delegate tools)

    Usage::

        loader = SkillLoader()
        # Lead Agent sees only descriptions
        descriptions = loader.list_skills()
        # Delegate tool loads full prompt when needed
        skill = loader.load("examiner")
    """

    def __init__(self, skills_dir: str | Path | None = None):
        """Initialize with the skills directory path.

        Args:
            skills_dir: Path to skills directory. Defaults to
                backend/episto/skills/ (same directory as this file).
        """
        self._skills_dir = Path(skills_dir) if skills_dir else SKILLS_DIR

    def _resolve_skill_path(self, name: str) -> Path:
        """Resolve a skill name to its .md file path.

        Args:
            name: Skill name (without extension), e.g. "examiner".

        Returns:
            Path to the .md file.
        """
        if not name.endswith(".md"):
            name = f"{name}.md"
        return self._skills_dir / name

    def load(self, name: str) -> Skill:
        """Load a skill by name, parsing frontmatter and content.

        Args:
            name: Skill name (without extension), e.g. "examiner".

        Returns:
            Skill object with metadata and prompt content.

        Raises:
            FileNotFoundError: If the skill file does not exist.
            ValueError: If frontmatter is missing or malformed.
        """
        skill_path = self._resolve_skill_path(name)

        if not skill_path.exists():
            raise FileNotFoundError(f"Skill file not found: {skill_path}")

        content = skill_path.read_text(encoding="utf-8")
        parsed = _parse_frontmatter(content)

        if parsed is None:
            raise ValueError(
                f"Skill file '{skill_path}' has no valid YAML frontmatter. "
                "Expected format: ---\\nkey: value\\n---\\n<body>"
            )

        metadata, body = parsed

        skill_name = metadata.get("name", name)
        description = metadata.get("description", "")

        logger.info("Loaded skill '%s' from %s", skill_name, skill_path)

        return Skill(
            name=skill_name,
            description=description,
            metadata=metadata,
            content=body.strip(),
            file_path=skill_path,
        )

    def list_skills(self) -> list[dict[str, str]]:
        """List all available skills with name and description only.

        Used by the Lead Agent's system prompt to show available skills.
        Does NOT load the full prompt content (Progressive Loading).

        Returns:
            List of dicts with 'name' and 'description' keys.
        """
        skills = []
        for md_file in sorted(self._skills_dir.glob("*.md")):
            try:
                content = md_file.read_text(encoding="utf-8")
                parsed = _parse_frontmatter(content)
                if parsed is not None:
                    metadata, _ = parsed
                    skills.append({
                        "name": metadata.get("name", md_file.stem),
                        "description": metadata.get("description", ""),
                    })
            except Exception as e:
                logger.warning("Failed to parse skill file %s: %s", md_file, e)

        return skills


# ---------------------------------------------------------------------------
# Smoke test
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import os

    os.environ.pop("SSL_CERT_FILE", None)

    print("=== SkillLoader Smoke Test ===\n")

    loader = SkillLoader()

    # Test 1: list_skills (progressive loading - descriptions only)
    print("--- list_skills() ---")
    descriptions = loader.list_skills()
    for desc in descriptions:
        print(f"  {desc['name']}: {desc['description'][:80]}...")

    # Test 2: load examiner skill (full content)
    print("\n--- load('examiner') ---")
    skill = loader.load("examiner")
    print(f"  name: {skill.name}")
    print(f"  description: {skill.description}")
    print(f"  metadata: {skill.metadata}")
    print(f"  content (first 200 chars): {skill.content[:200]}...")

    # Test 3: load socratic_tutor skill
    print("\n--- load('socratic_tutor') ---")
    tutor_skill = loader.load("socratic_tutor")
    print(f"  name: {tutor_skill.name}")
    print(f"  description: {tutor_skill.description}")
    print(f"  content (first 200 chars): {tutor_skill.content[:200]}...")

    print("\nAll SkillLoader tests passed!")
