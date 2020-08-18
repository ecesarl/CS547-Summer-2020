'use strict';

const fs = require('fs'); // Require the fs library to read files

const Mustache = require('mustache'); // Template library.
const axios = require('axios');
const aws4 = require('aws4');
const awscred = require('awscred');
const URL = require('url');

var html; // Set a variable outside of function in order to reuse

// The function that will read content from our html file
const getHtml = () => {
  if (html) return html; // If the content has existed, do not read it again
  // Return a promise
  return new Promise((resolve, reject) => {
    fs.readFile('static/index.html', 'utf8', (err, data) => {
      if (err) reject(err);
      html = data;
      resolve(html);
    });
  });
};

const fetchBooks = async () => {
  // Use AWS4 to sign the request
  const url = URL.parse(process.env.fetch_books_api);
  const opts = {
    host: url.hostname,
    path: url.pathname,
  };
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) await new Promise((resolve, reject) => {
    awscred.loadCredentials((err, data) => {
      if (err) reject(err);
      process.env.AWS_ACCESS_KEY_ID = data.accessKeyId;
      process.env.AWS_SECRET_ACCESS_KEY = data.secretAccessKey;
      if (data.sessionToken) process.env.AWS_SESSION_TOKEN = data.sessionToken;
      resolve();
    });
  });

  aws4.sign(opts);

  const headers = {
    Host: opts.headers.Host,
    'X-Amz-Date': opts.headers['X-Amz-Date'],
    Authorization: opts.headers.Authorization,
    'X-Amz-Security-Token': opts.headers['X-Amz-Security-Token'],
  };
  // If 'X-Amz-Security-Token' does not exsit, delete it for the local test.
  if (!headers['X-Amz-Security-Token']) delete headers['X-Amz-Security-Token'];

  return axios.get(process.env.fetch_books_api, {
    headers,
  });
};

// The main Lambda function
module.exports.handler = async (event, context, callback) => {
  const htmlcontent = await getHtml(); // Get the content

  const response = {
    statusCode: 200,
    headers: { // Set up the header
      'Content-Type': 'text/html; charset=UTF-8',
    },
    body: htmlcontent,
  };
  callback(null, response);
};