addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request));
});

const createAirtableRecord = async body => {
    console.log('Creating Airtable record with body:', body);
    const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}`, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: {
            Authorization: `Bearer ${AIRTABLE_API_KEY}`,
            'Content-Type': 'application/json'
        }
    });

    const result = await response.json();
    console.log('Airtable Response:', result);
    return result;
};

const submitHandler = async request => {
    if (request.method !== "POST") {
        console.log('Method not allowed:', request.method);
        return new Response("Method Not Allowed", {
            status: 405,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            }
        });
    }

    console.log('Processing form submission');
    const body = await request.formData();
    console.log('Form data received:', Array.from(body.entries()));

    // Turnstile validation
    const SECRET_KEY = `${TURNSTILE_SECRET}`;
    const token = body.get('cf-turnstile-response');
    const ip = request.headers.get('CF-Connecting-IP');

    console.log('Turnstile token:', token);
    console.log('Client IP:', ip);

    if (!token) {
        const params = new URLSearchParams();
        body.forEach((value, key) => {
            if (key !== 'cf-turnstile-response') {
                params.append(key, value);
            }
        });
        return Response.redirect(`https://form123.davidpacold.app/failure.html?${params.toString()}`, 302);
    }

    let formData = new FormData();
    formData.append('secret', SECRET_KEY);
    formData.append('response', token);
    formData.append('remoteip', ip);

    const result = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        body: formData,
        method: 'POST'
    });

    const outcome = await result.json();
    console.log('Turnstile validation result:', outcome);

    if (!outcome.success) {
        const params = new URLSearchParams();
        body.forEach((value, key) => {
            if (key !== 'cf-turnstile-response') {
                params.append(key, value);
            }
        });
        return Response.redirect(`https://form123.davidpacold.app/failure.html?${params.toString()}`, 302);
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

    console.log('Request Body to Airtable:', reqBody);

    const airtableResponse = await createAirtableRecord(reqBody);

    if (airtableResponse.error) {
        console.log('Failed to create Airtable record:', airtableResponse.error);
        return new Response('Failed to create Airtable record', {
            status: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            }
        });
    }

    console.log('Airtable record created successfully');

    const params = new URLSearchParams();
    body.forEach((value, key) => {
        if (key !== 'cf-turnstile-response') {
            params.append(key, value);
        }
    });

    return new Response(null, {
        status: 302,
        headers: {
            'Location': `https://form123.davidpacold.app/success.html?${params.toString()}`,
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
    });
};

async function handleRequest(request) {
    const url = new URL(request.url);
    console.log('Handling request for URL:', url);

    if (url.pathname === "/submit") {
        return submitHandler(request);
    }

    console.log('Path not found:', url.pathname);
    return new Response('Not Found', {
        status: 404,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
    });
}