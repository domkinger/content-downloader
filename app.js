const express = require('express');
const http = require('http');
const ytdl = require('ytdl-core');
const sanitize = require('sanitize-filename');
const { WebSocketServer, OPEN } = require('ws');

const app = express();
const port = 3030;

// Create an HTTP server from the Express application
const server = http.createServer(app);

const wss = new WebSocketServer({ noServer: true });

// Helper function to get the safe file name
function getSafeFileName(title) {
  return sanitize(title).replace(/[^a-zA-Z0-9_-]/g, '_');
}

app.get('/download/:type/:id', async (req, res) => {
  const { type, id: videoId } = req.params;
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

  try {
    const info = await ytdl.getInfo(videoUrl);
    const title = getSafeFileName(info.videoDetails.title) + (type === 'video' ? '.mp4' : '.mp3');
    res.header('Content-Disposition', `attachment; filename="${title}"`);

    const filterOption = type === 'video' ? 'videoandaudio' : 'audioonly';
    const stream = ytdl.downloadFromInfo(info, { filter: filterOption });

    let downloaded = 0;
    let approximateFileSize = getApproximateFileSize(info, filterOption);

    stream.on('data', (chunk) => {
      downloaded += chunk.length;
      const progress = approximateFileSize ? (downloaded / approximateFileSize * 100) : 0;
      const progressMessage = progress.toFixed(2);

      wss.clients.forEach(client => {
        if (client.readyState === OPEN) {
          client.send(JSON.stringify({ videoId, progress: progressMessage }));
        }
      });
    });

    stream.on('end', () => {
      wss.clients.forEach(client => {
        if (client.readyState === OPEN) {
          client.send(JSON.stringify({ videoId, status: 'completed' }));
        }
      });
    });

    stream.pipe(res);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Error downloading the file');
  }
});

function getApproximateFileSize(info, filterOption) {
  // Find the format based on the filter option
  const format = ytdl.chooseFormat(info.formats, { filter: filterOption });
  if (format && format.contentLength) {
    return parseInt(format.contentLength, 10);
  }
  return null;
}

// Correctly handle the upgrade event
server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
  });
});

// Start the server
server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
