const axios = require('axios');


const fs = require("fs");


// we need to also use .get on each takes owner, and repo

let totalContributes = 0;


axios.get('https://streak-stats.demolab.com?user=noahrepublic').then((response) => {
    const result = response.data.match(/<text[^>]*>\s*(.+)\s*<\/text>/)[0].split('>')[1].split('<')[0].replace(',', '');
      
    totalContributes = parseInt(result);

    if (typeof totalContributes === 'number') {
        fs.writeFile("contributions.txt", totalContributes.toString(), (err) => {
            if (err) {
                console.log(err);
            }
        });
    }
});

const promises = [];

let linesWrote = 0;

axios.get("https://api.github.com/users/noahrepublic/repos").then((response) => {
    const repos = response.data;
    let totalStars = 0;

    const promise = repos.forEach((repo) => {
      
        axios.get(`https://api.codetabs.com/v1/loc?github=${repo.full_name}`).then((response) => {
            console.log(response.data[-1].linesOfCode)

            if (typeof response.data[-1].linesOfCode === 'number') {
                linesWrote += parseInt(response.data[-1].linesOfCode);
            }
        });
    });

    promises.push(promise);
});

Promise.all(promises).then(() => {
    if (typeof linesWrote === 'number') {
        fs.writeFile("linesWrote.txt", linesWrote.toString(), (err) => {
            if (err) {
                console.log(err);
            }
        });
    }
});