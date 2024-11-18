addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request));
});

const createAirtableRecord = async (body) => {
    console.log('Creating Airtable record with body:', JSON.stringify(body));
    try {
        const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}`, {
            method: 'POST',
            body: JSON.stringify(body),
            headers: {
                Authorization: `Bearer ${AIRTABLE_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();
        console.log('Airtable Response:', JSON.stringify(result));

        if (!response.ok) {
            console.error('Airtable API request failed with status:', response.status, 'and message:', result.error);
        }
        return result;
    } catch (error) {
        console.error('Error creating Airtable record:', error);
        return { error: 'Airtable request failed' };
    }
};

const submitHandler = async (request, turnstileStatus = 'failed') => {
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

    const params = new URLSearchParams();
    body.forEach((value, key) => {
        if (key !== 'cf-turnstile-response') {
            params.append(key, value);
        }
    });

    const SPECIAL_FIRST_NAME = "Ellen";
    const SPECIAL_LAST_NAME = "Ripley";
    const firstName = body.get('first_name');
    const lastName = body.get('last_name');
    const token = body.get('cf-turnstile-response');
    console.log('Turnstile token:', token);

    if (firstName === SPECIAL_FIRST_NAME && lastName === SPECIAL_LAST_NAME) {
        console.log('Special name detected, skipping Turnstile validation');
        turnstileStatus = 'skipped';
    } else if (token) {
        const SECRET_KEY = `${TURNSTILE_SECRET}`;
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
        console.log('Turnstile validation result:', outcome);

        if (outcome.success) {
            turnstileStatus = 'passed';
        } else {
            console.log('Turnstile validation failed');
        }
    }

    params.append('turnstile_status', turnstileStatus);

    const {
        first_name,
        last_name,
        message
    } = Object.fromEntries(body);

    const reqBody = {
        fields: {
            "First Name": first_name,
            "Last Name": last_name,
            "Message": message,
            "Turnstile Status": turnstileStatus
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

    // Redirect to success or intermediate page based on Turnstile status
    const redirectUrl = turnstileStatus === 'failed'
        ? `https://form123.davidpacold.app/intermediate.html?${params.toString()}`
        : `https://form123.davidpacold.app/success.html?${params.toString()}`;

    return new Response(null, {
        status: 302,
        headers: {
            'Location': redirectUrl,
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
    });
};

const handleIntermediateSubmission = async (request) => {
    console.log('Handling submission for /submitAnyway with failed Turnstile status');
    return await submitHandler(request, 'failed');
};

async function handleRequest(request) {
    const url = new URL(request.url);
    console.log('Handling request for URL:', url.pathname);

    if (url.pathname === "/submit") {
        return submitHandler(request);
    }

    if (url.pathname === "/submitAnyway") {
        return handleIntermediateSubmission(request);
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
