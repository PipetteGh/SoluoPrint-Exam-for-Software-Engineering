import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { provider, to, content, api_key, api_secret, sender_id, api_url } = await req.json();
    let result;

    if (provider === 'smsonline') {
      // SMSOnlineGH API
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `key ${api_key}`
      };
      const messageData = {
        text: content,
        type: 0,
        sender: sender_id || 'EKONGraphix',
        destinations: [to]
      };
      const response = await fetch(api_url || 'https://api.smsonlinegh.com/v5/sms/send', {
        method: 'POST',
        headers,
        body: JSON.stringify(messageData)
      });
      const data = await response.json().catch(() => ({}));
      result = { success: response.ok, data, status: response.status };
    } else {
      // Hubtel API
      const url = new URL(api_url || 'https://smsc.hubtel.com/v1/messages/send');
      url.searchParams.append('clientid', api_key || '');
      url.searchParams.append('clientsecret', api_secret || '');
      url.searchParams.append('from', sender_id || '');
      url.searchParams.append('to', to);
      url.searchParams.append('content', content);
      const response = await fetch(url.toString(), { method: 'GET' });
      const data = await response.json().catch(() => ({}));
      result = { success: response.ok, data, status: response.status };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
