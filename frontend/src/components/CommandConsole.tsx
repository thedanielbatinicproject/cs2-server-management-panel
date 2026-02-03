import React, { useState } from 'react';
import { Card, Form, Button, Alert, ListGroup, Spinner, Badge } from 'react-bootstrap';
import { servers as serversApi } from '../api';
import { BulkResult } from '../types';

interface CommandConsoleProps {
  selectedServerIds: string[];
}

const CommandConsole: React.FC<CommandConsoleProps> = ({ selectedServerIds }) => {
  const [commands, setCommands] = useState('');
  const [results, setResults] = useState<BulkResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleExecute = async () => {
    if (selectedServerIds.length === 0) {
      setError('Select at least one server');
      return;
    }
    const lines = commands
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      setError('Enter at least one command');
      return;
    }
    setError('');
    setLoading(true);
    setResults([]);
    try {
      const res = await serversApi.bulkExecute(selectedServerIds, lines, { delay: 200, stopOnFail: false });
      setResults(res.data.results || []);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Execution failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mb-3">
      <Card.Header>Command Console</Card.Header>
      <Card.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        <Form.Group className="mb-2">
          <Form.Label>Commands (one per line)</Form.Label>
          <Form.Control
            as="textarea"
            rows={1}
            value={commands}
            onChange={(e) => setCommands(e.target.value)}
            placeholder="say Hello"
          />
        </Form.Group>
        <Button variant="primary" onClick={handleExecute} disabled={loading}>
          {loading ? (
            <>
              <Spinner size="sm" className="me-1" />
              Sending...
            </>
          ) : (
            'Execute'
          )}
        </Button>
        <small className="text-muted ms-2">{selectedServerIds.length} server(s) selected</small>
      </Card.Body>
      {results.length > 0 && (
        <ListGroup variant="flush">
          {results.map((r, i) => (
            <ListGroup.Item key={i}>
              <strong>Server {r.serverId}</strong>{' '}
              {r.error ? (
                <Badge bg="danger">Error: {r.error}</Badge>
              ) : r.failed ? (
                <Badge bg="warning" text="dark">
                  Partial
                </Badge>
              ) : (
                <Badge bg="success">OK</Badge>
              )}
              {r.results && (
                <ul className="mb-0 mt-1 small">
                  {r.results.map((line, j) => (
                    <li key={j} className={line.ok ? '' : 'text-danger'}>
                      {line.ok ? line.res || '(no output)' : line.error}
                    </li>
                  ))}
                </ul>
              )}
            </ListGroup.Item>
          ))}
        </ListGroup>
      )}
    </Card>
  );
};

export default CommandConsole;
