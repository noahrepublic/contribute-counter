const axios = require('axios');


const fs = require("fs");

function sleep(milliseconds) {
    var start = new Date().getTime();
    for (var i = 0; i < 1e7; i++) {
      if ((new Date().getTime() - start) > milliseconds){
        break;
      }
    }
  }

function promiseSleep(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
}
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
 
    repos.forEach((repo) => {
        function request(response) {
            const length = response.data.length;
            console.log(response.data)
            console.log(response.data[length - 1])

            if (typeof response.data[length - 1].linesOfCode === 'number') {
                linesWrote += parseInt(response.data[length - 1].linesOfCode);
            }

            if (typeof linesWrote === 'number') {
                fs.writeFile("linesWrote.txt", linesWrote.toString(), (err) => {
                    if (err) {
                        console.log(err);
                    }
                });
            }

            console.log(linesWrote)
        }

        function onFail() {
            console.log("Failed to get " + repo.full_name)

            promises.push(promiseSleep(60*1000).then(() => {
                console.log("Retrying " + repo.full_name)
                const retryPromise = axios.get(`https://api.codetabs.com/v1/loc?github=${repo.full_name}`).then(request).catch(onFail);

                promises.push(retryPromise);
            }))
        }

        console.log("Requesting" + repo.full_name)
        const promise =  axios.get(`https://api.codetabs.com/v1/loc?github=${repo.full_name}`).then(request).catch(onFail);

        promises.push(promise);
        sleep(10 * 1000)
    });
});

