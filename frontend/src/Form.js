import React, { useState } from 'react';

const SERVERLESS_FN_URL = "https://workers-airtable-form.davidpacold-app.workers.dev/submit";
const SPECIAL_FIRST_NAME = "Ellen"; // Set your special first name here
const SPECIAL_LAST_NAME = "Ripley"; // Set your special last name here

const Form = () => {
  const [errorMessage, setErrorMessage] = useState('');
  const [isSpecialName, setIsSpecialName] = useState(false);

  const handleTurnstile = (token) => {
    const turnstileInput = document.getElementById('cf-turnstile-response');
    turnstileInput.value = token;
  };

  const handleTurnstileError = () => {
    window.location.href = '/failure.html';
  };

  const handleNameChange = () => {
    const firstName = document.getElementById('first_name').value;
    const lastName = document.getElementById('last_name').value;

    // Check if both first and last name match the special name
    if (firstName === SPECIAL_FIRST_NAME && lastName === SPECIAL_LAST_NAME) {
      setIsSpecialName(true);  // Disable Turnstile if special name is entered
    } else {
      setIsSpecialName(false); // Re-enable Turnstile for all other names
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const params = new URLSearchParams();
    formData.forEach((value, key) => {
      params.append(key, value);
    });

    try {
      if (!isSpecialName) {
        // Only validate Turnstile if it's not a special name
        const token = formData.get('cf-turnstile-response');
        if (!token) {
          setErrorMessage("Please complete the CAPTCHA.");
          return;
        }
      }

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
            onChange={handleNameChange} // Attach onChange handler
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
            onChange={handleNameChange} // Attach onChange handler
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
      
      {/* Only show Turnstile widget if it's not the special name */}
      {!isSpecialName && (
        <div className="cf-turnstile" 
          data-sitekey="0x4AAAAAAAA3bX86SlzobPLJ" 
          data-callback="handleTurnstile" 
          data-error-callback="handleTurnstileError" 
          data-retry="never"
        ></div>
      )}
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
