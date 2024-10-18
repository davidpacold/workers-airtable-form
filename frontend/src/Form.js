import React, { useState, useEffect } from 'react';

const SERVERLESS_FN_URL = "https://workers-airtable-form.davidpacold-app.workers.dev/submit";
const SPECIAL_FIRST_NAME = "Ellen";
const SPECIAL_LAST_NAME = "Ripley";

// Function to dynamically load the Turnstile script
const loadTurnstileScript = () => {
  const existingScript = document.getElementById('turnstile-script');
  if (!existingScript) {
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback';
    script.id = 'turnstile-script';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
  }
};

const Form = () => {
  const [errorMessage, setErrorMessage] = useState('');
  const [isSpecialName, setIsSpecialName] = useState(false);

  // Function to handle Turnstile success callback
  const handleTurnstile = (token) => {
    const turnstileInput = document.getElementById('cf-turnstile-response');
    turnstileInput.value = token;
  };

  // Function to handle Turnstile errors
  const handleTurnstileError = () => {
    window.location.href = '/failure.html';
  };

  // Function to dynamically load/reload the Turnstile widget
  const loadTurnstile = () => {
    const existingTurnstile = document.querySelector('#turnstile-widget');
    if (existingTurnstile) {
      existingTurnstile.remove();
    }

    if (!isSpecialName) {
      const turnstileDiv = document.createElement('div');
      turnstileDiv.id = 'turnstile-widget';
      turnstileDiv.className = 'cf-turnstile';
      turnstileDiv.setAttribute('data-sitekey', '0x4AAAAAAAA3bX86SlzobPLJ');
      turnstileDiv.setAttribute('data-callback', 'handleTurnstile');
      turnstileDiv.setAttribute('data-error-callback', 'handleTurnstileError');
      turnstileDiv.setAttribute('data-retry', 'never');

      document.getElementById('turnstile-container').appendChild(turnstileDiv);

      if (window.turnstile) {
        window.turnstile.render('#turnstile-widget');
      }
    }
  };

  // Effect to load the Turnstile script and widget on mount
  useEffect(() => {
    loadTurnstileScript();  // Load the Turnstile API script
    loadTurnstile();        // Load the widget after the script is ready
  }, [isSpecialName]);

  // Function to handle name changes and check for the special name
  const handleNameChange = () => {
    const firstName = document.getElementById('first_name').value;
    const lastName = document.getElementById('last_name').value;

    if (firstName === SPECIAL_FIRST_NAME && lastName === SPECIAL_LAST_NAME) {
      setIsSpecialName(true);
    } else {
      setIsSpecialName(false);
    }
  };
  
  // Function to handle form submission added 10-18-2024
  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const params = new URLSearchParams();
    formData.forEach((value, key) => {
      params.append(key, value);
    });
  
    try {
      const token = formData.get('cf-turnstile-response');
  
      if (!isSpecialName && !token) {
        // If CAPTCHA is not passed, let the user submit but track it as failed.
        setErrorMessage("CAPTCHA not completed, but allowing submission.");
      }
  
      // Proceed with form submission regardless of CAPTCHA status
      const response = await fetch(SERVERLESS_FN_URL, {
        method: 'POST',
        body: formData,
        mode: 'cors'
      });
  
      if (response.redirected) {
        window.location.href = response.url;
      } else {
        const result = await response.json();
        console.log('Submission result:', result);
      }
    } catch (error) {
      console.error('Form submission error', error);
      window.location.href = `/failure.html?${params.toString()}`;
    }
  };

  // // Function to handle form submission commented out 10-18-2024
  // const handleSubmit = async (e) => {
  //   e.preventDefault();
  //   const formData = new FormData(e.target);
  //   const params = new URLSearchParams();
  //   formData.forEach((value, key) => {
  //     params.append(key, value);
  //   });

  //   try {
  //     if (!isSpecialName) {
  //       const token = formData.get('cf-turnstile-response');
  //       if (!token) {
  //         setErrorMessage("Please complete the CAPTCHA.");
  //         return;
  //       }
  //     }

  //     const response = await fetch(SERVERLESS_FN_URL, {
  //       method: 'POST',
  //       body: formData,
  //       mode: 'cors'
  //     });

  //     if (response.redirected) {
  //       window.location.href = response.url;
  //     } else {
  //       const result = await response.json();
  //       console.log('Submission result:', result);
  //     }
  //   } catch (error) {
  //     console.error('Form submission error', error);
  //     window.location.href = `/failure.html?${params.toString()}`;
  //   }
  // };

  return (
    <form 
      action={SERVERLESS_FN_URL} 
      method="POST" 
      className="mt-6 grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-8"
      onSubmit={handleSubmit}
    >
      <div>
        <label htmlFor="first_name" className="block text-sm font-medium text-warm-gray-900">
          First name
        </label>
        <div className="mt-1">
          <input
            type="text"
            name="first_name"
            id="first_name"
            autoComplete="given-name"
            placeholder="Ellen"
            required
            className="py-3 px-4 block w-full shadow-sm text-warm-gray-900 focus:ring-teal-500 focus:border-teal-500 border-warm-gray-300 rounded-md"
            onChange={handleNameChange}
          />
        </div>
      </div>
      <div>
        <label htmlFor="last_name" className="block text-sm font-medium text-warm-gray-900">
          Last name
        </label>
        <div className="mt-1">
          <input
            type="text"
            name="last_name"
            id="last_name"
            autoComplete="family-name"
            placeholder="Ripley"
            required
            className="py-3 px-4 block w-full shadow-sm text-warm-gray-900 focus:ring-teal-500 focus:border-teal-500 border-warm-gray-300 rounded-md"
            onChange={handleNameChange}
          />
        </div>
      </div>
      <div className="sm:col-span-2">
        <div className="flex justify-between">
          <label htmlFor="message" className="block text-sm font-medium text-warm-gray-900">
            Message
          </label>
          <span id="message-max" className="text-sm text-warm-gray-500">
            Max. 500 characters
          </span>
        </div>
        <div className="mt-1">
          <textarea
            id="message"
            name="message"
            rows={4}
            className="py-3 px-4 block w-full shadow-sm text-warm-gray-900 focus:ring-teal-500 focus:border-teal-500 border-warm-gray-300 rounded-md"
            aria-describedby="message-max"
            placeholder="Enter your message here..."
            required
          />
        </div>
      </div>
      
      {/* Container for dynamically loading the Turnstile widget */}
      <div id="turnstile-container"></div>
      <input type="hidden" id="cf-turnstile-response" name="cf-turnstile-response" />

      {errorMessage && (
        <div className="text-red-500 mt-2">
          {errorMessage}
        </div>
      )}
      <div className="sm:col-span-2 sm:flex sm:justify-end">
        <button
          type="submit"
          className="mt-2 w-full inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-teal-500 hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 sm:w-auto"
        >
          Submit
        </button>
      </div>
    </form>
  );
};

export default Form;
