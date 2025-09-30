import { createClient } from '@supabase/supabase-js'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltando configurações do Supabase. Verifique as variáveis de ambiente.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Queries - Funções para buscar dados
export const queries = {
  getEvents: async ({ type = null } = {}) => {
    let query = supabase
      .from('credenciamento_events')
      .select('*')
      .order('date', { ascending: true })

    if (type) {
      query = query.eq('type', type)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  },

  getParticipants: async ({ eventId = null } = {}) => {
    let query = supabase
      .from('credenciamento_participants')
      .select('*')

    if (eventId) {
      query = query.eq('event_id', eventId)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  },

  getRecentCredentials: async (limit = 10) => {
    const { data, error } = await supabase
      .from('credenciamento_logs')
      .select(`
        *,
        participant:credenciamento_participants(name),
        event:credenciamento_events(name)
      `)
      .eq('action', 'check_in')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data
  }
}

// Mutations - Funções para modificar dados
export const mutations = {
  checkInParticipant: async ({ participantId, eventId, attendantName }) => {
    // Primeiro atualiza o participante
    const { error: participantError } = await supabase
      .from('credenciamento_participants')
      .update({ 
        checked_in_at: new Date().toISOString(),
        checked_in_by: attendantName
      })
      .eq('id', participantId)

    if (participantError) throw participantError

    // Depois registra o log
    const { error: logError } = await supabase
      .from('credenciamento_logs')
      .insert([{
        participant_id: participantId,
        event_id: eventId,
        action: 'check_in',
        attendant_name: attendantName
      }])

    if (logError) throw logError

    return true
  },

  authenticateAdmin: async (username, password) => {
    const { data, error } = await supabase
      .from('credenciamento_admin_users')
      .select()
      .eq('username', username)
      .eq('password', password)
      .single()

    if (error) throw error
    return data
  }
}

// Hook para métricas do dashboard
export const useDashboardMetrics = () => {
  const { data: events, isLoading: eventsLoading, error: eventsError } = useQuery({
    queryKey: ['events'],
    queryFn: () => queries.getEvents()
  })
  
  const { 
    data: recentCredentials, 
    isLoading: credentialsLoading, 
    error: credentialsError 
  } = useQuery({
    queryKey: ['recentCredentials'],
    queryFn: () => queries.getRecentCredentials(5)
  })

  // Calcula as métricas
  const metrics = useMemo(() => {
    if (!events || !recentCredentials) return null

    const activeEvents = events.filter(e => e.active).length
    const totalEvents = events.length
    const totalParticipants = events.reduce((acc, event) => acc + (event.participants_count || 0), 0)
    
    // Agrupa credenciamentos por hora
    const credentialingByHour = recentCredentials.reduce((acc, cred) => {
      const hour = new Date(cred.created_at).getHours()
      acc[hour] = (acc[hour] || 0) + 1
      return acc
    }, {})

    // Converte para array para facilitar renderização
    const credentialingByHourArray = Object.entries(credentialingByHour)
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour - b.hour)

    return {
      activeEvents,
      totalEvents,
      totalParticipants,
      participantsToday: recentCredentials.length,
      recentCredentials,
      credentialingByHour: credentialingByHourArray
    }
  }, [events, recentCredentials])

  return {
    metrics: useMemo(() => {
      if (!events || !recentCredentials) return null

      const activeEvents = events.filter(e => e.active).length
      const totalEvents = events.length
      const totalParticipants = events.reduce((acc, event) => acc + (event.participants_count || 0), 0)
      
      // Agrupa credenciamentos por hora
      const credentialingByHour = recentCredentials.reduce((acc, cred) => {
        const hour = new Date(cred.created_at).getHours()
        acc[hour] = (acc[hour] || 0) + 1
        return acc
      }, {})

      // Converte para array para facilitar renderização
      const credentialingByHourArray = Object.entries(credentialingByHour)
        .map(([hour, count]) => ({ hour, count }))
        .sort((a, b) => a.hour - b.hour)

      return {
        activeEvents,
        totalEvents,
        totalParticipants,
        participantsToday: recentCredentials.length,
        recentCredentials,
        credentialingByHour: credentialingByHourArray
      }
    }, [events, recentCredentials]),
    isLoading: eventsLoading || credentialsLoading,
    error: eventsError || credentialsError
  }
}