import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createAxiomServer } from './server.mjs';

let server;
let baseURL;
let capturedRequest;

before(async () => {
  server = createAxiomServer({
    apiKey: 'test-key',
    model: 'test-groq',
    fetchImpl: async (url, options) => {
      capturedRequest = { url, options };
      return new Response(JSON.stringify({
        choices: [{ message: { content: 'Sales grew 12% in the sample.' } }]
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  baseURL = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});

test('serves the app from the same origin as the analyst endpoint', async () => {
  const response = await fetch(baseURL);
  assert.equal(response.status, 200);
  assert.match(await response.text(), /AXIOM — Neural Data Intelligence/);
});

test('sends context to Groq using a server-side API key', async () => {
  const response = await fetch(`${baseURL}/api/analyze`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: baseURL },
    body: JSON.stringify({ query: 'What is the revenue trend?', context: 'Rows: 100; revenue average: 42.' })
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { answer: 'Sales grew 12% in the sample.' });
  assert.equal(capturedRequest.url, 'https://api.groq.com/openai/v1/chat/completions');
  assert.equal(capturedRequest.options.headers.authorization, 'Bearer test-key');
  const body = JSON.parse(capturedRequest.options.body);
  assert.equal(body.model, 'test-groq');
  assert.match(body.messages[1].content, /revenue average: 42/);
  assert.match(body.messages[1].content, /What is the revenue trend\?/);
  assert.match(body.messages[0].content, /business intelligence analyst/);
});

test('rejects invalid questions before making an upstream request', async () => {
  capturedRequest = undefined;
  const response = await fetch(`${baseURL}/api/analyze`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: '  ', context: 'sample' })
  });

  assert.equal(response.status, 400);
  assert.equal(capturedRequest, undefined);
});

test('rejects JSON null as an invalid REST request', async () => {
  const response = await fetch(`${baseURL}/api/analyze`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: 'null'
  });

  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /JSON object/);
});

test('reports missing Groq configuration clearly', async () => {
  const unconfiguredServer = createAxiomServer({
    apiKey: '',
    fetchImpl: async () => {
      throw new Error('Must not call Groq without an API key');
    }
  });
  await new Promise(resolve => unconfiguredServer.listen(0, '127.0.0.1', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${unconfiguredServer.address().port}/api/analyze`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'Summarize it', context: 'Rows: 10' })
    });
    assert.equal(response.status, 503);
    assert.match((await response.json()).error, /GROQ_API_KEY/);
  } finally {
    await new Promise((resolve, reject) => unconfiguredServer.close(error => error ? reject(error) : resolve()));
  }
});

test('accepts a legacy Groq key stored in XAI_API_KEY', async () => {
  const mismatchedKeyServer = createAxiomServer({
    apiKey: 'gsk_test-key',
    fetchImpl: async (url, options) => {
      capturedRequest = { url, options };
      return new Response(JSON.stringify({
        choices: [{ message: { content: 'Groq is connected.' } }]
      }), { status: 200 });
    }
  });
  await new Promise(resolve => mismatchedKeyServer.listen(0, '127.0.0.1', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${mismatchedKeyServer.address().port}/api/analyze`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'Summarize it', context: 'Rows: 10' })
    });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).answer, 'Groq is connected.');
    assert.equal(capturedRequest.url, 'https://api.groq.com/openai/v1/chat/completions');
  } finally {
    await new Promise((resolve, reject) => mismatchedKeyServer.close(error => error ? reject(error) : resolve()));
  }
});

test('does not expose Groq credentials when upstream rejects the key', async () => {
  const unauthorizedServer = createAxiomServer({
    apiKey: 'secret-test-key',
    fetchImpl: async () => new Response('{}', { status: 401 })
  });
  await new Promise(resolve => unauthorizedServer.listen(0, '127.0.0.1', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${unauthorizedServer.address().port}/api/analyze`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'Summarize it', context: 'Rows: 10' })
    });
    assert.equal(response.status, 502);
    const error = (await response.json()).error;
    assert.match(error, /Groq rejected GROQ_API_KEY/);
    assert.match(error, /invalid, revoked, or copied incorrectly/);
    assert.match(error, /restart AXIOM/);
    assert.doesNotMatch(error, /secret-test-key/);
  } finally {
    await new Promise((resolve, reject) => unauthorizedServer.close(error => error ? reject(error) : resolve()));
  }
});

test('reports when the configured Groq model is unavailable', async () => {
  const unavailableModelServer = createAxiomServer({
    apiKey: 'test-key',
    model: 'missing-model',
    fetchImpl: async () => new Response('{}', { status: 404 })
  });
  await new Promise(resolve => unavailableModelServer.listen(0, '127.0.0.1', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${unavailableModelServer.address().port}/api/analyze`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'Summarize it', context: 'Rows: 10' })
    });
    assert.equal(response.status, 502);
    assert.match((await response.json()).error, /missing-model.*GROQ_MODEL/);
  } finally {
    await new Promise((resolve, reject) => unavailableModelServer.close(error => error ? reject(error) : resolve()));
  }
});

test('reports Groq request timeouts with an actionable hint', async () => {
  const timeoutServer = createAxiomServer({
    apiKey: 'test-key',
    fetchImpl: async () => {
      const error = new Error('Request timed out');
      error.name = 'TimeoutError';
      throw error;
    }
  });
  await new Promise(resolve => timeoutServer.listen(0, '127.0.0.1', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${timeoutServer.address().port}/api/analyze`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'Summarize it', context: 'Rows: 10' })
    });
    assert.equal(response.status, 504);
    assert.match((await response.json()).error, /GROQ_MODEL/);
  } finally {
    await new Promise((resolve, reject) => timeoutServer.close(error => error ? reject(error) : resolve()));
  }
});
