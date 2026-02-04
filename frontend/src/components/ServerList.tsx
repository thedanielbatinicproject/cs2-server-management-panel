import React, { useState, useEffect } from 'react';
import { Card, ListGroup, Form, Button, Modal, Alert, Badge, Spinner } from 'react-bootstrap';
import { servers as serversApi } from '../api';
import { Server } from '../types';

interface ServerListProps {
  selectedIds: string[];
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
}

interface ServerPingStatus {
  [serverId: string]: { online: boolean; ping: number | null; loading?: boolean };
}

const SESSION_KEY = 'cs2rcon_selected_servers';

const ServerList: React.FC<ServerListProps> = ({ selectedIds, setSelectedIds }) => {
  const [servers, setServers] = useState<Server[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editServer, setEditServer] = useState<Server | null>(null);
  const [form, setForm] = useState({ name: '', host: '', port: 27015, password: '' });
  const [error, setError] = useState('');
  const [pingStatus, setPingStatus] = useState<ServerPingStatus>({});
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const res = await serversApi.list();
      setServers(res.data);
    } catch (e) {
      setError('Failed to load servers');
    }
  };

  // Load servers and restore selection from session
  useEffect(() => {
    load();
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setSelectedIds(parsed);
        }
      } catch (e) {}
    }
  }, [setSelectedIds]);

  // Save selection to session
  useEffect(() => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(selectedIds));
  }, [selectedIds]);

  const handleToggle = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSelectAll = () => {
    if (selectedIds.length === servers.length) setSelectedIds([]);
    else setSelectedIds(servers.map((s) => s.id));
  };

  const handleRefreshAll = async () => {
    setRefreshing(true);
    // Set all to loading
    const loadingStatus: ServerPingStatus = {};
    servers.forEach(s => {
      loadingStatus[s.id] = { online: false, ping: null, loading: true };
    });
    setPingStatus(loadingStatus);

    try {
      const res = await serversApi.pingAll();
      const newStatus: ServerPingStatus = {};
      res.data.results.forEach(r => {
        newStatus[r.serverId] = { online: r.online, ping: r.ping };
      });
      setPingStatus(newStatus);
    } catch (e) {
      setError('Failed to refresh server status');
    }
    setRefreshing(false);
  };

  const openAdd = () => {
    setForm({ name: '', host: '', port: 27015, password: '' });
    setShowAdd(true);
  };

  const openEdit = (s: Server) => {
    setForm({ name: s.name, host: s.host, port: s.port, password: s.password });
    setEditServer(s);
  };

  const handleSave = async () => {
    try {
      if (editServer) {
        await serversApi.update(editServer.id, form);
      } else {
        await serversApi.create(form);
      }
      setShowAdd(false);
      setEditServer(null);
      load();
    } catch (e) {
      setError('Save failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete server?')) return;
    await serversApi.remove(id);
    load();
  };

  const getStatusBadge = (serverId: string) => {
    const status = pingStatus[serverId];
    if (!status) return null;
    if (status.loading) {
      return <Spinner animation="border" size="sm" className="ms-2" />;
    }
    if (status.online) {
      return (
        <Badge bg="success" className="ms-2">
          Online - {status.ping}ms
        </Badge>
      );
    }
    return <Badge bg="danger" className="ms-2">Offline</Badge>;
  };

  return (
    <Card className="mb-3">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <span>Servers</span>
        <div>
          <Button 
            size="sm" 
            variant="outline-info" 
            className="me-2" 
            onClick={handleRefreshAll}
            disabled={refreshing || servers.length === 0}
          >
            {refreshing ? (
              <><Spinner size="sm" animation="border" /> Checking...</>
            ) : (
              'Check Status'
            )}
          </Button>
          <Button size="sm" variant="outline-secondary" className="me-2" onClick={handleSelectAll}>
            {selectedIds.length === servers.length ? 'Deselect All' : 'Select All'}
          </Button>
          <Button size="sm" variant="primary" onClick={openAdd}>
            + Add
          </Button>
        </div>
      </Card.Header>
      {error && (
        <Alert variant="danger" className="m-2" dismissible onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      <ListGroup variant="flush">
        {servers.map((s) => (
          <ListGroup.Item key={s.id} className="d-flex align-items-center">
            <Form.Check
              type="checkbox"
              checked={selectedIds.includes(s.id)}
              onChange={() => handleToggle(s.id)}
              className="me-2"
            />
            <span className="flex-grow-1">
              <strong>{s.name}</strong>{' '}
              <Badge bg="secondary">
                {s.host}:{s.port}
              </Badge>
              {getStatusBadge(s.id)}
            </span>
            <Button size="sm" variant="outline-primary" className="me-1" onClick={() => openEdit(s)}>
              Edit
            </Button>
            <Button size="sm" variant="outline-danger" onClick={() => handleDelete(s.id)}>
              Del
            </Button>
          </ListGroup.Item>
        ))}
        {servers.length === 0 && (
          <ListGroup.Item className="text-muted">No servers. Add one!</ListGroup.Item>
        )}
      </ListGroup>

      <Modal show={showAdd || !!editServer} onHide={() => { setShowAdd(false); setEditServer(null); }}>
        <Modal.Header closeButton>
          <Modal.Title>{editServer ? 'Edit Server' : 'Add Server'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-2">
            <Form.Label>Name</Form.Label>
            <Form.Control value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label>Host</Form.Label>
            <Form.Control value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} />
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label>Port</Form.Label>
            <Form.Control
              type="number"
              value={form.port}
              onChange={(e) => setForm({ ...form, port: Number(e.target.value) })}
            />
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label>RCON Password</Form.Label>
            <Form.Control
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => { setShowAdd(false); setEditServer(null); }}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave}>
            Save
          </Button>
        </Modal.Footer>
      </Modal>
    </Card>
  );
};

export default ServerList;
