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
        
        githubClient.rest.repos.listContributors({
            owner: "noahrepublic",
            repo: response.data[i].name
        }).then((response) => {
           for (let j = 0; j < response.data.length; j++) {
               const contributor = response.data[j]

               if (contributor.login != "noahrepublic") {
                continue
               }
               commitCount += contributor.contributions
           }
        })
        
    }
})

fs.writeFile("commit-count.txt", commitCount, (err) => {
    if (err) {
        console.log(err)
    }
})