import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addDays, addWeeks, addMonths, isBefore, addYears } from 'date-fns';
import { sv } from 'date-fns/locale';
import { useTasks } from '../../../shared/api/useTasks';
import { getEvents, createEvent, updateEvent, deleteEvent } from '../api/calendarApi';
import { getRisker } from '../../risk/api/risk';
import { getAvvikelser } from '../../avvikelse/api/avvikelse';
import { useAuth } from '../../../shared/api/AuthContext';
import { Plus, X } from 'lucide-react';
import { toast } from 'react-toastify';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '../styles/calendar.css';

const locales = {
  'sv': sv,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

const CalendarPage = () => {
  const navigate = useNavigate();
  const { tasks, loading: tasksLoading } = useTasks();
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [risker, setRisker] = useState([]);
  const [avvikelser, setAvvikelser] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [view, setView] = useState('month');
  const [date, setDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    all_day: false,
    recurrence: 'none'
  });
  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const [eventsData, riskerData, avvikelserData] = await Promise.all([
          getEvents(),
          getRisker(),
          getAvvikelser()
        ]);
        setCalendarEvents(eventsData);
        setRisker(riskerData);
        setAvvikelser(avvikelserData);
      } catch (error) {
        console.error('Failed to fetch calendar data', error);
        toast.error('Kunde inte hämta kalenderdata');
      } finally {
        setEventsLoading(false);
      }
    };
    fetchEvents();
  }, []);

  if (tasksLoading || eventsLoading) return <div className="loading">Laddar kalender...</div>;

  // Map tasks to calendar events
  const taskEvents = tasks
    .filter(task => task.dueDate) // Only tasks with due dates
    .map(task => ({
      id: `task-${task.id}`,
      title: `[Uppgift] ${task.title}`,
      start: new Date(task.dueDate),
      end: new Date(task.dueDate),
      allDay: true,
      resource: { ...task, type: 'task' }
    }));

  // Map risks to calendar events
  const riskEvents = risker
    .filter(risk => risk.deadline)
    .map(risk => ({
      id: `risk-${risk.id}`,
      title: `[Risk] ${risk.title}`,
      start: new Date(risk.deadline),
      end: new Date(risk.deadline),
      allDay: true,
      resource: { ...risk, type: 'risk' }
    }));

  // Map deviations to calendar events
  const avvikelseEvents = avvikelser
    .filter(a => a.deadline)
    .map(a => ({
      id: `avvikelse-${a.id}`,
      title: `[Avvikelse] ${a.titel}`,
      start: new Date(a.deadline),
      end: new Date(a.deadline),
      allDay: true,
      resource: { ...a, type: 'avvikelse' }
    }));

  const customEvents = [];
  calendarEvents.forEach(event => {
    const start = new Date(event.start_date || new Date());
    const end = new Date(event.end_date || new Date());
    const duration = end.getTime() - start.getTime();

    // Add the original event
    customEvents.push({
      id: `event-${event.id}`,
      title: event.title,
      start: start,
      end: end,
      allDay: event.all_day,
      resource: { ...event, type: 'event' }
    });

    // Handle recurrence
    if (event.recurrence && event.recurrence !== 'none') {
      let currentStart = start;
      const limit = addYears(new Date(), 1); // Expand up to 1 year from now

      while (isBefore(currentStart, limit)) {
        if (event.recurrence === 'daily') currentStart = addDays(currentStart, 1);
        else if (event.recurrence === 'weekly') currentStart = addWeeks(currentStart, 1);
        else if (event.recurrence === 'monthly') currentStart = addMonths(currentStart, 1);
        else break;

        if (isBefore(currentStart, limit)) {
          customEvents.push({
            id: `event-${event.id}-${currentStart.getTime()}`,
            title: event.title,
            start: currentStart,
            end: new Date(currentStart.getTime() + duration),
            allDay: event.all_day,
            resource: { ...event, type: 'event', is_recurrence: true }
          });
        }
      }
    }
  });

  const allEvents = [...taskEvents, ...riskEvents, ...avvikelseEvents, ...customEvents];

  const eventStyleGetter = (event) => {
    let backgroundColor = 'var(--primary-color)'; // default todo
    if (event.resource.type === 'task') {
      if (event.resource.status === 'in-progress') backgroundColor = 'var(--warning-color)';
      if (event.resource.status === 'done') backgroundColor = 'var(--success-color)';
    } else if (event.resource.type === 'risk') {
      backgroundColor = 'var(--danger-color)'; // red for risks
    } else if (event.resource.type === 'avvikelse') {
      backgroundColor = 'var(--event-avvikelse)'; // orange for deviations
    } else {
      backgroundColor = 'var(--event-custom)'; // purple for custom events
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.9,
        color: 'white',
        border: '0px',
        display: 'block'
      }
    };
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
  };

  const handleSelectEvent = (event) => {
    if (event.resource.type === 'task') {
      const taskId = event.resource.id;
      navigate('/tasks', { state: { openId: taskId } });
      return;
    }
    if (event.resource.type === 'risk') {
      const riskId = event.resource.id;
      navigate('/risk', { state: { openId: riskId } });
      return;
    }
    if (event.resource.type === 'avvikelse') {
      const avvikelseId = event.resource.id;
      navigate('/avvikelse', { state: { openId: avvikelseId } });
      return;
    }

    const eventData = event.resource;
    setSelectedEvent(eventData);
    setFormData({
      title: eventData.title || '',
      description: eventData.description || '',
      start_date: eventData.start_date ? format(new Date(eventData.start_date), "yyyy-MM-dd'T'HH:mm") : '',
      end_date: eventData.end_date ? format(new Date(eventData.end_date), "yyyy-MM-dd'T'HH:mm") : '',
      all_day: eventData.all_day || false,
      recurrence: eventData.recurrence || 'none'
    });
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setSelectedEvent(null);
    setFormData({
      title: '',
      description: '',
      start_date: '',
      end_date: '',
      all_day: false,
      recurrence: 'none'
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedEvent) {
        // Update existing event
        const updated = await updateEvent(selectedEvent.id, formData);
        setCalendarEvents(calendarEvents.map(ev => ev.id === selectedEvent.id ? { ...ev, ...formData } : ev));
        toast.success('Händelse uppdaterad!');
      } else {
        // Create new event
        const newEvent = {
          ...formData,
          created_by: currentUser?.id || 'anonymous'
        };
        const created = await createEvent(newEvent);
        setCalendarEvents([...calendarEvents, created]);
        toast.success('Händelse skapad!');
      }
      setIsModalOpen(false);
      setFormData({ title: '', description: '', start_date: '', end_date: '', all_day: false, recurrence: 'none' });
      setSelectedEvent(null);
    } catch (error) {
      console.error('Failed to save event', error);
      toast.error('Kunde inte spara händelse');
    }
  };

  const handleDelete = async () => {
    if (!selectedEvent) return;
    if (!window.confirm('Är du säker på att du vill ta bort denna händelse?')) return;

    try {
      await deleteEvent(selectedEvent.id);
      setCalendarEvents(calendarEvents.filter(ev => ev.id !== selectedEvent.id));
      setIsModalOpen(false);
      setSelectedEvent(null);
      toast.success('Händelse borttagen');
    } catch (error) {
      console.error('Failed to delete event', error);
      toast.error('Kunde inte ta bort händelse');
    }
  };

  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <div>
          <h1>Kalender</h1>
          <div className="calendar-legend">
            <span className="legend-item"><span className="dot todo"></span> Att göra</span>
            <span className="legend-item"><span className="dot in-progress"></span> Pågår</span>
            <span className="legend-item"><span className="dot done"></span> Klar</span>
            <span className="legend-item"><span className="dot risk" style={{backgroundColor: 'var(--danger-color)'}}></span> Risk</span>
            <span className="legend-item"><span className="dot avvikelse" style={{backgroundColor: 'var(--event-avvikelse)'}}></span> Avvikelse</span>
            <span className="legend-item"><span className="dot event" style={{backgroundColor: 'var(--event-custom)'}}></span> Händelse</span>
          </div>
        </div>
        <button className="btn-primary" onClick={handleAddNew}>
          <Plus size={20} />
          <span>Ny händelse</span>
        </button>
      </div>
      
      <div className="calendar-wrapper">
        <Calendar
          localizer={localizer}
          events={allEvents}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          culture="sv"
          view={view}
          onView={setView}
          date={date}
          onNavigate={setDate}
          onSelectEvent={handleSelectEvent}
          eventPropGetter={eventStyleGetter}
          messages={{
            next: "Nästa",
            previous: "Föregående",
            today: "Idag",
            month: "Månad",
            week: "Vecka",
            day: "Dag",
            agenda: "Agenda",
            date: "Datum",
            time: "Tid",
            event: "Händelse",
            noEventsInRange: "Inga uppgifter under denna period."
          }}
        />
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{selectedEvent ? 'Redigera händelse' : 'Skapa ny händelse'}</h2>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="event-form">
              <div className="form-group">
                <label htmlFor="title">Titel *</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="start_date">Startdatum *</label>
                  <input
                    type="datetime-local"
                    id="start_date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="end_date">Slutdatum *</label>
                  <input
                    type="datetime-local"
                    id="end_date"
                    name="end_date"
                    value={formData.end_date}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group checkbox-group">
                <input
                  type="checkbox"
                  id="all_day"
                  name="all_day"
                  checked={formData.all_day}
                  onChange={handleInputChange}
                />
                <label htmlFor="all_day">Heldag</label>
              </div>

              <div className="form-group">
                <label htmlFor="recurrence">Upprepa</label>
                <select
                  id="recurrence"
                  name="recurrence"
                  value={formData.recurrence}
                  onChange={handleInputChange}
                >
                  <option value="none">Ingen upprepning</option>
                  <option value="daily">Dagligen</option>
                  <option value="weekly">Varje vecka</option>
                  <option value="monthly">Varje månad</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="description">Beskrivning</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="3"
                ></textarea>
              </div>

              <div className="form-actions">
                {selectedEvent && (
                  <button type="button" className="btn-danger" onClick={handleDelete} style={{ marginRight: 'auto', backgroundColor: 'var(--danger-color)', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}>
                    Ta bort
                  </button>
                )}
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Avbryt
                </button>
                <button type="submit" className="btn-primary">
                  {selectedEvent ? 'Uppdatera' : 'Spara Händelse'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarPage;
