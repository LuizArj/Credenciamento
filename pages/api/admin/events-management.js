import { withApiAuth } from '../../../utils/api-auth';
import { getSasEvents, createSasEvent, updateSasEvent, deleteSasEvent } from '../../../utils/sas-client';

async function handler(req, res) {
  switch (req.method) {
    case 'GET':
      try {
        const events = await getSasEvents();
        return res.status(200).json(events);
      } catch (error) {
        console.error('Erro ao buscar eventos:', error);
        return res.status(500).json({ error: 'Erro ao buscar eventos' });
      }

    case 'POST':
      try {
        const event = await createSasEvent(req.body);
        return res.status(201).json(event);
      } catch (error) {
        console.error('Erro ao criar evento:', error);
        return res.status(500).json({ error: 'Erro ao criar evento' });
      }

    case 'PUT':
      try {
        const { id, ...eventData } = req.body;
        if (!id) {
          return res.status(400).json({ error: 'ID do evento não fornecido' });
        }
        const event = await updateSasEvent(id, eventData);
        return res.status(200).json(event);
      } catch (error) {
        console.error('Erro ao atualizar evento:', error);
        return res.status(500).json({ error: 'Erro ao atualizar evento' });
      }

    case 'DELETE':
      try {
        const { id } = req.query;
        if (!id) {
          return res.status(400).json({ error: 'ID do evento não fornecido' });
        }
        await deleteSasEvent(id);
        return res.status(200).json({ message: 'Evento removido com sucesso' });
      } catch (error) {
        console.error('Erro ao remover evento:', error);
        return res.status(500).json({ error: 'Erro ao remover evento' });
      }

    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}

export default withApiAuth(handler, ['manage_events']);