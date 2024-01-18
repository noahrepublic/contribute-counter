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


