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

    // Initialize URLSearchParams for form values
    const params = new URLSearchParams();
    body.forEach((value, key) => {
        if (key !== 'cf-turnstile-response') {  // Do not append Turnstile response to params
            params.append(key, value);
        }
    });

    // Special name check
    const SPECIAL_FIRST_NAME = "Ellen";
    const SPECIAL_LAST_NAME = "Ripley";

    const firstName = body.get('first_name');
    const lastName = body.get('last_name');
    const token = body.get('cf-turnstile-response'); // This will be null/empty if skipped

    console.log('Turnstile token:', token);

    let turnstileStatus = 'failed'; // Default to 'failed'
    
    // Skip Turnstile validation if the special name is provided
    if (firstName === SPECIAL_FIRST_NAME && lastName === SPECIAL_LAST_NAME) {
        console.log('Special name detected, skipping Turnstile validation');
        turnstileStatus = 'skipped';  // Mark as skipped
    } else {
        // Turnstile validation is required for non-special names
        if (!token) {
            console.log('Missing Turnstile token');
        } else {
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
                console.log('Turnstile validation failed, redirecting to intermediate page.');
                return new Response(null, {
                    status: 302,
                    headers: {
                        'Location': `https://form123.davidpacold.app/intermediate.html?${params.toString()}&turnstile_status=failed`,
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type'
                    }
                });
            }
            
        }
    }

    // Proceed with Airtable record creation
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
            "Turnstile Status": turnstileStatus  // Add Turnstile status to Airtable
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

    return new Response(null, {
        status: 302,
        headers: {
            'Location': `https://form123.davidpacold.app/success.html?${params.toString()}&turnstile_status=${turnstileStatus}`,
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
    });
    
    // return new Response(null, {
    //     status: 302,
    //     headers: {
    //         'Location': `https://form123.davidpacold.app/success.html?${params.toString()}`,
    //         'Access-Control-Allow-Origin': '*',
    //         'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    //         'Access-Control-Allow-Headers': 'Content-Type'
    //     }
    // });
};

async function handleRequest(request) {
    const url = new URL(request.url);
    console.log('Handling request for URL:', url);

    if (url.pathname === "/submit") {
        return submitHandler(request);
    }

    if (url.pathname === "/submitAnyway") {
        // Proceed with submission as usual, marking the Turnstile status as 'failed'
        const turnstileStatus = 'failed';
        return submitFormWithStatus(request, turnstileStatus);
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
