const GITHUB_API = "https://api.github.com";

export async function fetchUserRepos(token: string) {
  const res = await fetch(`${GITHUB_API}/user/repos?per_page=100&sort=updated`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch repos: ${res.status}`);
  }

  const repos = await res.json();
  return repos.map((repo: any) => ({
    name: repo.name,
    fullName: repo.full_name,
    private: repo.private,
    defaultBranch: repo.default_branch,
  }));
}

export async function createUserRepo(
  token: string,
  name: string,
  isPrivate: boolean
) {
  const res = await fetch(`${GITHUB_API}/user/repos`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      private: isPrivate,
      auto_init: true, // creates an initial commit + README automatically
    }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Failed to create repo");
  }

  return res.json();
}

export async function createCommit(
  token: string,
  owner: string,
  repo: string,
  message: string
) {
  const path = "log.md";

  // Step A: get the current file (if it exists) to retrieve its SHA
  const fileRes = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
    }
  );

  let sha: string | undefined;
  let existingContent = "";

  if (fileRes.ok) {
    const fileData = await fileRes.json();
    sha = fileData.sha;
    existingContent = Buffer.from(fileData.content, "base64").toString("utf-8");
  }

  // Step B: append a new line with today's timestamp
  const newContent = `${existingContent}\n- ${new Date().toISOString()}: ${message}`;
  const encodedContent = Buffer.from(newContent).toString("base64");

  // Step C: create or update the file, which creates the commit
  const commitRes = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        content: encodedContent,
        sha, // omit if file doesn't exist yet — GitHub will create it
      }),
    }
  );

  if (!commitRes.ok) {
    const error = await commitRes.json();
    throw new Error(error.message || "Failed to create commit");
  }

  return commitRes.json();
}