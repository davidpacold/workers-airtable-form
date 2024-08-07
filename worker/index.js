addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request));
});

const createAirtableRecord = async body => {
    console.log('Creating Airtable record with body:', JSON.stringify(body));
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

    const params = new URLSearchParams();
    body.forEach((value, key) => {
        params.append(key, value);
    });

    if (!token) {
        console.log('Missing Turnstile token');
        return Response.redirect(`https://form123.davidpacold.app/failure.html?${params.toString()}`, 302);
    }

    let formData = new FormData();
    formData.append('secret', SECRET_KEY);
    formData.append('response', token);

    // Perform Turnstile check
    const turnstileResponse = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        body: formData
    });
    const turnstileData = await turnstileResponse.json();

    console.log('Turnstile Response:', turnstileData);

    if (!turnstileData.success) {
        console.log('Turnstile validation failed');
        return Response.redirect(`https://form123.davidpacold.app/failure.html?${params.toString()}`, 302);
    }

    // Prepare Airtable record
    const recordData = {};
    body.forEach((value, key) => {
        if (key !== 'cf-turnstile-response') {
            recordData[key] = value;
        }
    });

    const airtableRecord = { 
        fields: {
            "First Name": recordData.first_name,
            "Last Name": recordData.last_name,
            "Email": recordData.email,
            "Phone Number": recordData.phone,
            "Subject": recordData.subject,
            "Message": recordData.message
        }
    };

    console.log('Sending to Airtable:', JSON.stringify(airtableRecord));

    // If Turnstile check passes, proceed with creating Airtable record
    const result = await createAirtableRecord(airtableRecord);

    console.log('Airtable record created:', result);

    // Redirect to success page with form data
    console.log('Redirecting to success page');
    return Response.redirect(`https://form123.davidpacold.app/success.html?${params.toString()}`, 302);
};

async function handleRequest(request) {
    return submitHandler(request);
}