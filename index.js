const { Octokit } = require("@octokit/rest");

const fs = require("fs");

const githubClient = new Octokit({
    userAgent: "commit-counter",   
})

// we need to also use .get on each takes owner, and repo

let commitCount = 0

githubClient.rest.repos.listForUser({
    username: "noahrepublic"
}).then((response) => {
    for (let i = 0; i < response.data.length; i++) {
        const repo = response.data[i]
        
        console.log(`Getting contributors for ${repo.name}`)
        githubClient.rest.repos.listContributors({
            owner: "noahrepublic",
            repo: response.data[i].name
        }).then((response) => {
           for (let j = 0; j < response.data.length; j++) {
               const contributor = response.data[j]

               console.log(contributor.login + " " + contributor.contributions + " commits to " + repo.name)

            console.log(contributor.login == "noahrepublic")

               if (contributor.login == "noahrepublic") {
                commitCount += contributor.contributions
               }
           }
        })
        
    }
})


console.log(commitCount)
if (typeof commitCount === 'number') {
    console.log('Writing commit count to file')
    fs.writeFile("commit-count.txt", commitCount.toString(), (err) => {
        if (err) {
            console.log(err)
        }
    })
}
