import React, { useState, useEffect, useMemo } from 'react';
import { Card, ListGroup, Button, Modal, Form, Badge, InputGroup, Pagination } from 'react-bootstrap';
import { prompts as promptsApi } from '../api';
import { Prompt } from '../types';
import { useAuth } from '../App';

interface PromptManagerProps {
  selectedServerIds: string[];
  onExecute: (lines: string[], promptName: string) => void;
}

const ITEMS_PER_PAGE = 10;

const PromptManager: React.FC<PromptManagerProps> = ({ selectedServerIds, onExecute }) => {
  const { user } = useAuth();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editPrompt, setEditPrompt] = useState<Prompt | null>(null);
  const [form, setForm] = useState({ name: '', lines: '' });
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const canEdit = user && (user.role === 'superadmin' || user.role === 'admin' || user.isSuperuser || 
    (user.permissions?.prompts === 'edit'));
  const canRun = user && (user.role === 'superadmin' || user.role === 'admin' || user.isSuperuser || 
    (user.permissions?.prompts === 'edit' || user.permissions?.prompts === 'run'));

  const load = async () => {
    const res = await promptsApi.list();
    setPrompts(res.data);
  };

  useEffect(() => {
    load();
  }, []);

  // Filtered and paginated prompts
  const filteredPrompts = useMemo(() => {
    if (!search.trim()) return prompts;
    const s = search.toLowerCase();
    return prompts.filter(
      (p) =>
        p.name.toLowerCase().includes(s) ||
        p.lines.some((l) => l.toLowerCase().includes(s))
    );
  }, [prompts, search]);

  const totalPages = Math.ceil(filteredPrompts.length / ITEMS_PER_PAGE);
  const paginatedPrompts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredPrompts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredPrompts, currentPage]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const openAdd = () => {
    setForm({ name: '', lines: '' });
    setShowAdd(true);
  };

  const openEdit = (p: Prompt) => {
    setForm({ name: p.name, lines: (p.lines || []).join('\n') });
    setEditPrompt(p);
  };

  const handleSave = async () => {
    const data = {
      name: form.name,
      lines: form.lines
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean),
    };
    if (editPrompt) await promptsApi.update(editPrompt.id, data);
    else await promptsApi.create(data);
    setShowAdd(false);
    setEditPrompt(null);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete prompt?')) return;
    await promptsApi.remove(id);
    load();
  };

  const handleRun = (p: Prompt) => {
    if (selectedServerIds.length === 0) {
      alert('Select at least one server');
      return;
    }
    onExecute(p.lines, p.name);
  };

  return (
    <Card className="mb-3">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <span>Prompts (Command Sets)</span>
        <div className="d-flex gap-2">
          <InputGroup size="sm" style={{ width: '200px' }}>
            <Form.Control
              placeholder="Search prompts..."
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
        {paginatedPrompts.map((p) => (
          <ListGroup.Item key={p.id} className="d-flex align-items-center">
            <span className="flex-grow-1">
              <strong>{p.name}</strong>{' '}
              <Badge bg="secondary">{p.lines?.length || 0} lines</Badge>
            </span>
            {canRun && (
              <Button size="sm" variant="success" className="me-1" onClick={() => handleRun(p)}>
                Run
              </Button>
            )}
            {canEdit && (
              <>
                <Button size="sm" variant="outline-primary" className="me-1" onClick={() => openEdit(p)}>
                  Edit
                </Button>
                <Button size="sm" variant="outline-danger" onClick={() => handleDelete(p.id)}>
                  Del
                </Button>
              </>
            )}
          </ListGroup.Item>
        ))}
        {filteredPrompts.length === 0 && (
          <ListGroup.Item className="text-muted">
            {search ? 'No prompts match your search' : 'No prompts yet'}
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

      <Modal show={showAdd || !!editPrompt} onHide={() => { setShowAdd(false); setEditPrompt(null); }}>
        <Modal.Header closeButton>
          <Modal.Title>{editPrompt ? 'Edit Prompt' : 'Add Prompt'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-2">
            <Form.Label>Name</Form.Label>
            <Form.Control
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Warmup Settings"
            />
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label>Commands (one per line)</Form.Label>
            <Form.Control
              as="textarea"
              rows={6}
              value={form.lines}
              onChange={(e) => setForm({ ...form, lines: e.target.value })}
              placeholder="mp_warmup_end&#10;mp_restartgame 1&#10;sv_cheats 0"
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => { setShowAdd(false); setEditPrompt(null); }}>
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

export default PromptManager;
