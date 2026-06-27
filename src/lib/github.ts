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

export async function createBackdatedCommit(
  token: string,
  owner: string,
  repo: string,
  message: string,
  date: Date,
  authorEmail: string,
  authorName: string
) {
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
  };

  // Step 1: get the latest commit on the default branch (to build on top of it)
  const repoRes = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, { headers });
  if (!repoRes.ok) throw new Error("Failed to fetch repo info");
  const repoData = await repoRes.json();
  const branch = repoData.default_branch;

  const refRes = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/git/ref/heads/${branch}`,
    { headers }
  );
  if (!refRes.ok) throw new Error("Failed to fetch branch ref");
  const refData = await refRes.json();
  const latestCommitSha = refData.object.sha;

  const commitRes = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/git/commits/${latestCommitSha}`,
    { headers }
  );
  const commitData = await commitRes.json();
  const baseTreeSha = commitData.tree.sha;

  // Step 2: get current file content (if it exists) so we can append to it
  const path = "log.md";
  const fileRes = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
    { headers }
  );

  let existingContent = "";
  if (fileRes.ok) {
    const fileData = await fileRes.json();
    existingContent = Buffer.from(fileData.content, "base64").toString("utf-8");
  }

  const newContent = `${existingContent}\n- ${date.toISOString()} (backfilled): ${message}`;

  // Step 3: create a new blob (the raw file content)
  const blobRes = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/git/blobs`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ content: newContent, encoding: "utf-8" }),
    }
  );
  const blobData = await blobRes.json();

  // Step 4: create a new tree (the file structure) pointing to that blob
  const treeRes = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/git/trees`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree: [
          {
            path,
            mode: "100644",
            type: "blob",
            sha: blobData.sha,
          },
        ],
      }),
    }
  );
  const treeData = await treeRes.json();

  // Step 5: create the actual commit, with a custom author/committer date
  const isoDate = date.toISOString();
  const newCommitRes = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/git/commits`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        message,
        tree: treeData.sha,
        parents: [latestCommitSha],
        author: { name: authorName, email: authorEmail, date: isoDate },
committer: { name: authorName, email: authorEmail, date: isoDate },
      }),
    }
  );
  const newCommitData = await newCommitRes.json();

  // Step 6: move the branch pointer to this new commit
  const updateRefRes = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/git/refs/heads/${branch}`,
    {
      method: "PATCH",
      headers,
      body: JSON.stringify({ sha: newCommitData.sha }),
    }
  );

  if (!updateRefRes.ok) {
    const error = await updateRefRes.json();
    throw new Error(error.message || "Failed to update branch ref");
  }

  return newCommitData;
}