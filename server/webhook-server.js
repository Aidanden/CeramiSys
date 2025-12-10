const express = require('express');
const { exec } = require('child_process');

const app = express();
app.use(express.json());

app.post('/webhook', (req, res) => {
    exec('/home/CeramicSys/deploy.sh', (err, stdout, stderr) => {
        if (err) {
            console.error(stderr);
            return res.status(500).send('Deploy failed');
        }
        console.log(stdout);
        res.send('Deploy successful');
    });
});

app.listen(3000, () => console.log('Webhook listener running on port 3000'));
