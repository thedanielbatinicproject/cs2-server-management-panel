import React, { useState, useEffect, useMemo } from 'react';
import { Card, ListGroup, Button, Modal, Form, Badge, InputGroup, Pagination } from 'react-bootstrap';
import { maps as mapsApi } from '../api';
import { GameMap, GameMode } from '../types';
import { useAuth } from '../App';

interface MapManagerProps {
  selectedServerIds: string[];
  onChangeMap: (mapName: string, workshopId: string | null, serverCommands: string[]) => void;
}

const ITEMS_PER_PAGE = 10;

const MapManager: React.FC<MapManagerProps> = ({ selectedServerIds, onChangeMap }) => {
  const { user } = useAuth();
  const [maps, setMaps] = useState<GameMap[]>([]);
  const [gamemodes, setGamemodes] = useState<GameMode[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editMap, setEditMap] = useState<GameMap | null>(null);
  const [form, setForm] = useState({ name: '', gamemode: 'de', workshopId: '', serverCommands: '' });
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const canEdit = user && (user.role === 'superadmin' || user.role === 'admin' || user.isSuperuser || 
    (user.permissions?.maps === 'edit'));
  const canRun = user && (user.role === 'superadmin' || user.role === 'admin' || user.isSuperuser || 
    (user.permissions?.maps === 'edit' || user.permissions?.maps === 'run'));

  const load = async () => {
    const [mRes, gRes] = await Promise.all([mapsApi.list(), mapsApi.gamemodes()]);
    setMaps(mRes.data);
    setGamemodes(gRes.data);
  };

  useEffect(() => {
    load();
  }, []);

  // Filtered and paginated maps
  const filteredMaps = useMemo(() => {
    if (!search.trim()) return maps;
    const s = search.toLowerCase();
    return maps.filter(
      (m) =>
        m.name.toLowerCase().includes(s) ||
        m.gamemode.toLowerCase().includes(s) ||
        (m.workshopId && m.workshopId.includes(s))
    );
  }, [maps, search]);

  const totalPages = Math.ceil(filteredMaps.length / ITEMS_PER_PAGE);
  const paginatedMaps = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredMaps.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredMaps, currentPage]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const openAdd = () => {
    setForm({ name: '', gamemode: 'de', workshopId: '', serverCommands: '' });
    setShowAdd(true);
  };

  const openEdit = (m: GameMap) => {
    setForm({
      name: m.name,
      gamemode: m.gamemode,
      workshopId: m.workshopId || '',
      serverCommands: (m.serverCommands || []).join('\n'),
    });
    setEditMap(m);
  };

  const handleSave = async () => {
    const data = {
      name: form.name,
      gamemode: form.gamemode,
      workshopId: form.workshopId || null,
      serverCommands: form.serverCommands
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean),
    };
    if (editMap) await mapsApi.update(editMap.id, data);
    else await mapsApi.create(data);
    setShowAdd(false);
    setEditMap(null);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete map?')) return;
    try {
      await mapsApi.remove(id);
      load();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Cannot delete map');
    }
  };

  const handlePlay = (m: GameMap) => {
    if (selectedServerIds.length === 0) {
      alert('Select at least one server');
      return;
    }
    // Pass workshopId separately - backend will use host_workshop_map for workshop maps
    // and changelevel for default/built-in maps
    onChangeMap(m.name, m.workshopId || null, m.serverCommands || []);
  };

  const getGamemodeName = (code: string) => gamemodes.find((g) => g.code === code)?.name || code;

  return (
    <Card className="mb-3">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <span>Maps</span>
        <div className="d-flex gap-2">
          <InputGroup size="sm" style={{ width: '200px' }}>
            <Form.Control
              placeholder="Search maps..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <Button variant="outline-secondary" onClick={() => setSearch('')}>
                ×
              </Button>
            )}
          </InputGroup>
          {canEdit && (
            <Button size="sm" variant="primary" onClick={openAdd}>
              + Add
            </Button>
          )}
        </div>
      </Card.Header>
      <ListGroup variant="flush">
        {paginatedMaps.map((m) => (
          <ListGroup.Item key={m.id} className="d-flex align-items-center">
            <span className="flex-grow-1">
              <strong>{m.name}</strong>{' '}
              <Badge bg="info">{getGamemodeName(m.gamemode)}</Badge>
              {m.isDefault && (
                <Badge bg="dark" className="ms-1">
                  Default
                </Badge>
              )}
              {m.workshopId && (
                <Badge bg="secondary" className="ms-1">
                  WS:{m.workshopId}
                </Badge>
              )}
              {m.serverCommands?.length > 0 && (
                <Badge bg="warning" text="dark" className="ms-1">
                  {m.serverCommands.length} cmds
                </Badge>
              )}
            </span>
            {canRun && (
              <Button size="sm" variant="success" className="me-1" onClick={() => handlePlay(m)}>
                Play
              </Button>
            )}
            {canEdit && (
              <Button size="sm" variant="outline-primary" className="me-1" onClick={() => openEdit(m)}>
                Edit
              </Button>
            )}
            {canEdit && !m.isDefault && (
              <Button size="sm" variant="outline-danger" onClick={() => handleDelete(m.id)}>
                Del
              </Button>
            )}
          </ListGroup.Item>
        ))}
        {filteredMaps.length === 0 && (
          <ListGroup.Item className="text-muted">
            {search ? 'No maps match your search' : 'No maps yet'}
          </ListGroup.Item>
        )}
      </ListGroup>
      {totalPages > 1 && (
        <Card.Footer>
          <Pagination className="mb-0 justify-content-center" size="sm">
            <Pagination.First onClick={() => setCurrentPage(1)} disabled={currentPage === 1} />
            <Pagination.Prev onClick={() => setCurrentPage((p) => p - 1)} disabled={currentPage === 1} />
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Pagination.Item key={page} active={page === currentPage} onClick={() => setCurrentPage(page)}>
                {page}
              </Pagination.Item>
            ))}
            <Pagination.Next onClick={() => setCurrentPage((p) => p + 1)} disabled={currentPage === totalPages} />
            <Pagination.Last onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} />
          </Pagination>
        </Card.Footer>
      )}

      <Modal show={showAdd || !!editMap} onHide={() => { setShowAdd(false); setEditMap(null); }}>
        <Modal.Header closeButton>
          <Modal.Title>{editMap ? 'Edit Map' : 'Add Map'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-2">
            <Form.Label>Name</Form.Label>
            <Form.Control
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="de_dust2"
              disabled={editMap?.isDefault}
            />
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label>Gamemode</Form.Label>
            <Form.Select 
              value={form.gamemode} 
              onChange={(e) => setForm({ ...form, gamemode: e.target.value })}
              disabled={editMap?.isDefault}
            >
              {gamemodes.map((g) => (
                <option key={g.code} value={g.code}>
                  {g.name} ({g.code})
                </option>
              ))}
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label>Workshop ID (optional)</Form.Label>
            <Form.Control
              value={form.workshopId}
              onChange={(e) => setForm({ ...form, workshopId: e.target.value })}
              placeholder="123456789"
              disabled={editMap?.isDefault}
            />
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label>Server Commands (one per line)</Form.Label>
            <Form.Control
              as="textarea"
              rows={4}
              value={form.serverCommands}
              onChange={(e) => setForm({ ...form, serverCommands: e.target.value })}
              placeholder="mp_warmup_end&#10;mp_restartgame 1"
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => { setShowAdd(false); setEditMap(null); }}>
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

export default MapManager;
