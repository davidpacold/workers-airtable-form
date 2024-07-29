addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
});

const createAirtableRecord = body => {
  return fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      'Content-type': `application/json`
    }
  })
};

const submitHandler = async request => {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: {
        'Access-Control-Allow-Origin': '*', // Adjust this to restrict origins
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  const body = await request.formData();
  
  // Turnstile validation
  const SECRET_KEY = `${TURNSTILE_SECRET}`;
  const token = body.get('cf-turnstile-response');
  const ip = request.headers.get('CF-Connecting-IP');

  let formData = new FormData();
  formData.append('secret', SECRET_KEY);
  formData.append('response', token);
  formData.append('remoteip', ip);

  const result = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    body: formData,
    method: 'POST'
  });

  const outcome = await result.json();
  if (!outcome.success) {
    return new Response('The provided Turnstile token was not valid! \n' + JSON.stringify(outcome), {
      headers: {
        'Access-Control-Allow-Origin': '*', // Adjust this to restrict origins
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  const {
    first_name,
    last_name,
    email,
    phone,
    subject,
    message
  } = Object.fromEntries(body);

  const reqBody = {
    fields: {
      "First Name": first_name,
      "Last Name": last_name,
      "Email": email,
      "Phone Number": phone,
      "Subject": subject,
      "Message": message
    }
  };

  await createAirtableRecord(reqBody);

  return new Response(null, {
    status: 302,
    headers: {
      'Location': '/success.html',
      'Access-Control-Allow-Origin': '*', // Adjust this to restrict origins
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
};

async function handleRequest(request) {
  const url = new URL(request.url);

  if (url.pathname === "/submit") {
    return submitHandler(request);
  }

  return new Response('Not Found', {
    status: 404,
    headers: {
      'Access-Control-Allow-Origin': '*', // Adjust this to restrict origins
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}