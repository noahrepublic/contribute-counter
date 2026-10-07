// Counts my GitHub contributions and lines committed for my portfolio website.
//
// contributions.txt - total contributions across all years (public + private),
//                     from GitHub's contribution calendar
// linesWrote.txt    - lines I've added across every non-fork repo I can access,
//                     from GitHub's per-author commit stats
//
// COUNTER_TOKEN must be a personal access token (classic, `repo` scope) so
// private and organization repos are included. Without it, linesWrote.txt
// is left alone rather than replaced with a public-only count.

const fs = require('fs')

const USER = 'noahrepublic'
const TOKEN = process.env.COUNTER_TOKEN || process.env.GITHUB_TOKEN
const HAS_PAT = Boolean(process.env.COUNTER_TOKEN)

// Weeks where I added more than this are imports or generated files (synced
// place files, vendored code), not lines I wrote, so they're skipped.
const MAX_WEEKLY_LINES = 10000

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function github(path, options = {}) {
  const res = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      ...(TOKEN && { Authorization: `Bearer ${TOKEN}` }),
      ...options.headers,
    },
    signal: AbortSignal.timeout(30 * 1000),
  })
  if (!res.ok) {
    throw new Error(`${path} -> ${res.status} ${await res.text()}`)
  }
  return res
}

async function graphql(query, variables) {
  const res = await github('/graphql', {
    method: 'POST',
    body: JSON.stringify({ query, variables }),
  })
  const { data, errors } = await res.json()
  if (errors) throw new Error(JSON.stringify(errors))
  return data
}

async function countContributions() {
  const { user } = await graphql(
    `query ($login: String!) {
      user(login: $login) { contributionsCollection { contributionYears } }
    }`,
    { login: USER }
  )

  let total = 0
  for (const year of user.contributionsCollection.contributionYears) {
    const { user: yearly } = await graphql(
      `query ($login: String!, $from: DateTime!, $to: DateTime!) {
        user(login: $login) {
          contributionsCollection(from: $from, to: $to) {
            contributionCalendar { totalContributions }
          }
        }
      }`,
      { login: USER, from: `${year}-01-01T00:00:00Z`, to: `${year}-12-31T23:59:59Z` }
    )
    total += yearly.contributionsCollection.contributionCalendar.totalContributions
  }
  return total
}

async function listRepos() {
  const repos = []
  for (let page = 1; ; page++) {
    const path = `/user/repos?affiliation=owner,collaborator,organization_member&per_page=100&page=${page}`
    const batch = await (await github(path)).json()
    repos.push(...batch)
    if (batch.length < 100) break
  }
  return repos.filter((repo) => !repo.fork)
}

// GitHub computes contributor stats in the background and answers 202 until
// they're ready, so poll a few times before giving up on a repo.
async function linesAddedIn(repo) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await github(`/repos/${repo.full_name}/stats/contributors`)
    if (res.status === 202) {
      await sleep(10 * 1000)
      continue
    }
    if (res.status === 204) return 0

    const contributors = await res.json()
    const me = contributors.find((c) => c.author?.login.toLowerCase() === USER)
    if (!me) return 0
    return me.weeks.reduce((sum, week) => sum + (week.a <= MAX_WEEKLY_LINES ? week.a : 0), 0)
  }
  throw new Error(`stats for ${repo.full_name} were not ready in time`)
}

async function countLines() {
  if (!HAS_PAT) throw new Error('COUNTER_TOKEN is not set')

  const repos = await listRepos()
  console.log(`Counting lines across ${repos.length} repos`)

  let total = 0
  let failed = 0
  const queue = [...repos]
  const worker = async () => {
    for (let repo; (repo = queue.shift()); ) {
      try {
        const lines = await linesAddedIn(repo)
        if (lines > 0) console.log(`  ${repo.full_name}: ${lines}`)
        total += lines
      } catch (err) {
        failed++
        console.warn(`  skipped ${repo.full_name}: ${err.message}`)
      }
    }
  }
  await Promise.all(Array.from({ length: 8 }, worker))

  // Don't overwrite a good number with a partial one.
  if (failed > repos.length / 4) {
    throw new Error(`${failed}/${repos.length} repos failed; keeping the previous count`)
  }
  return total
}

async function update(file, count) {
  try {
    const value = await count()
    fs.writeFileSync(file, String(value))
    console.log(`${file} = ${value}`)
  } catch (err) {
    process.exitCode = 1
    console.error(`${file} not updated: ${err.message}`)
  }
}

;(async () => {
  await update('contributions.txt', countContributions)
  await update('linesWrote.txt', countLines)
  // Always changes, so every run commits something and GitHub doesn't
  // disable the schedule for inactivity.
  fs.writeFileSync('updated.txt', new Date().toISOString())
})()
