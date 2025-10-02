import { getServerSession } from "next-auth";
import { authOptions } from "./auth/[...nextauth]";

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // First try with session authentication (for authenticated requests)
    const session = await getServerSession(req, res, authOptions);
    
    if (session && session.accessToken) {
      // Use user session token for authenticated API calls
      const apiUrl = `https://api.4.events/events/list`;
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Accept': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data && data.result) {
          const events = data.result
            .filter(event => event.active === "1")
            .map(event => ({
              id: event.event_id,
              name: event.event_name,
            }));
          
          return res.status(200).json(events);
        }
      }
    }

    // Fallback to client token authentication
    const response = await fetch(`https://api.4.events/events/list`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.FOUR_EVENTS_CLIENT_TOKEN}`,
      },
    });

    if (!response.ok) {
      console.error('4.events API error:', response.status, response.statusText);
      return res.status(500).json({ 
        message: 'Erro ao buscar eventos da 4.events',
        error: `HTTP ${response.status}: ${response.statusText}`
      });
    }

    const data = await response.json();
    console.log('4.events API response:', data);

    // Handle different possible response structures
    let events = [];
    
    if (Array.isArray(data)) {
      events = data;
    } else if (data.events && Array.isArray(data.events)) {
      events = data.events;
    } else if (data.data && Array.isArray(data.data)) {
      events = data.data;
    } else if (data.results && Array.isArray(data.results)) {
      events = data.results;
    } else if (data.result && Array.isArray(data.result)) {
      events = data.result;
    } else {
      console.warn('Unexpected API response structure:', data);
      events = [];
    }

    // Transform events to expected format
    const formattedEvents = events.map(event => ({
      id: event.id || event.event_id,
      name: event.name || event.title || event.event_name,
      description: event.description || '',
      startDate: event.start_date || event.startDate,
      endDate: event.end_date || event.endDate,
    }));

    return res.status(200).json(formattedEvents);
  } catch (error) {
    console.error('Error fetching events:', error);
    return res.status(500).json({ 
      message: 'Erro interno na API de eventos',
      error: error.message 
    });
  }
}