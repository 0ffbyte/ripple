export interface SkillMetadata {
  name: string;
  description: string;
}

const skillFiles = import.meta.glob<string>("./*/SKILL.md", {
  eager: true,
  query: "?raw",
  import: "default",
});

// load skill tool
function stripFrontmatter(content: string): string {
  const match = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  return match ? content.slice(match[0].length).trim() : content.trim();
}

export const loadSkill = async (name: string) => {
  // Prevent path traversal and invalid skill names.
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(name)) {
    throw new Error("Invalid skill name");
  }

  const PATH = `./${name}/SKILL.md`;
  const markdown = skillFiles[PATH];

  if (!markdown) return null;
  return {
    skillName: name,
    content: stripFrontmatter(markdown),
  };
};

export const loadSkills = async (names: string[]) => {
  const unique = [...new Set(names)];
  const skills = await Promise.all(unique.map(loadSkill));

  return skills.filter(
    (skill): skill is { skillName: string; content: string } => skill !== null,
  );
};
