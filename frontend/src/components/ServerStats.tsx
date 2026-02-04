import React, { useState, useEffect, useCallback } from 'react';
import { Card, Form, Table, Badge, Spinner, Button } from 'react-bootstrap';
import { servers as serversApi } from '../api';
import { Server } from '../types';

interface ServerStatsProps {
  servers: Server[];
}

interface PlayerInfo {
  id: string;
  name: string;
  ping: number;
  loss: number;
  time: string;
  state: string;
  address: string;
}

interface ServerStatus {
  online: boolean;
  ping: number | null;
  status: {
    hostname: string;
    map: string;
    mapWorkshopId: string | null;
    players: { current: number; max: number; bots: number };
    playerList: PlayerInfo[];
    version: string;
    steamId: string;
    ip: string;
    hibernating: boolean;
  } | null;
  teamScores: { ct: number; t: number } | null;
  error?: string;
  timestamp: number;
}

const SESSION_KEY = 'cs2rcon_stats_server';

const ServerStats: React.FC<ServerStatsProps> = ({ servers }) => {
  const [selectedServerId, setSelectedServerId] = useState<string>(() => {
    return sessionStorage.getItem(SESSION_KEY) || '';
  });
  const [status, setStatus] = useState<ServerStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchStatus = useCallback(async () => {
    if (!selectedServerId) return;
    
    setLoading(true);
    try {
      const res = await serversApi.getStatus(selectedServerId);
      setStatus(res.data as ServerStatus);
    } catch (e) {
      setStatus({
        online: false,
        ping: null,
        status: null,
        teamScores: null,
        error: 'Failed to fetch status',
        timestamp: Date.now(),
      });
    }
    setLoading(false);
  }, [selectedServerId]);

  // Save selection to session
  useEffect(() => {
    if (selectedServerId) {
      sessionStorage.setItem(SESSION_KEY, selectedServerId);
    } else {
      sessionStorage.removeItem(SESSION_KEY);
    }
  }, [selectedServerId]);

  // Fetch status on selection change
  useEffect(() => {
    if (selectedServerId) {
      fetchStatus();
    } else {
      setStatus(null);
    }
  }, [selectedServerId, fetchStatus]);

  // Auto-refresh every 5 seconds
  useEffect(() => {
    if (!autoRefresh || !selectedServerId) return;
    
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, selectedServerId, fetchStatus]);

  const selectedServer = servers.find(s => s.id === selectedServerId);

  return (
    <Card className="mb-3">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <span>📊 Server Stats</span>
        <div className="d-flex align-items-center gap-2">
          <Form.Check
            type="switch"
            id="auto-refresh"
            label="Auto (5s)"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            className="mb-0 me-2"
          />
          <Button 
            variant="outline-primary" 
            size="sm" 
            onClick={fetchStatus}
            disabled={!selectedServerId || loading}
          >
            {loading ? <Spinner size="sm" animation="border" /> : '🔄 Refresh'}
          </Button>
        </div>
      </Card.Header>
      <Card.Body>
        <Form.Select
          value={selectedServerId}
          onChange={(e) => setSelectedServerId(e.target.value)}
          className="mb-3"
        >
          <option value="">-- Select server --</option>
          {servers.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </Form.Select>

        {selectedServerId && status && (
          <div>
            {/* Status Header */}
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <Badge bg={status.online ? 'success' : 'danger'} className="me-2">
                  {status.online ? 'ONLINE' : 'OFFLINE'}
                </Badge>
                {status.ping !== null && (
                  <Badge bg={status.ping < 50 ? 'success' : status.ping < 100 ? 'warning' : 'danger'}>
                    {status.ping}ms
                  </Badge>
                )}
              </div>
              <small className="text-muted">
                Updated: {new Date(status.timestamp).toLocaleTimeString()}
              </small>
            </div>

            {status.online && status.status ? (
              <>
                {/* Server Info */}
                <Table size="sm" bordered className="mb-3">
                  <tbody>
                    <tr>
                      <td width="30%"><strong>Hostname</strong></td>
                      <td>{status.status.hostname || selectedServer?.name}</td>
                    </tr>
                    <tr>
                      <td><strong>Current Map</strong></td>
                      <td>
                        {status.status.map || 'Unknown'}
                        {status.status.mapWorkshopId && (
                          <Badge bg="info" className="ms-2">WS: {status.status.mapWorkshopId}</Badge>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td><strong>Players</strong></td>
                      <td>
                        {status.status.players.current} / {status.status.players.max}
                        {status.status.players.bots > 0 && ` (${status.status.players.bots} bots)`}
                        {status.status.hibernating && (
                          <Badge bg="secondary" className="ms-2">Hibernating</Badge>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td><strong>IP Address</strong></td>
                      <td>{status.status.ip || `${selectedServer?.host}:${selectedServer?.port}`}</td>
                    </tr>
                    <tr>
                      <td><strong>Version</strong></td>
                      <td>{status.status.version || 'Unknown'}</td>
                    </tr>
                  </tbody>
                </Table>

                {/* Player List */}
                {status.status.playerList.length > 0 ? (
                  <>
                    <h6>Players ({status.status.playerList.length})</h6>
                    <Table size="sm" striped bordered hover>
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Ping</th>
                          <th>Loss</th>
                          <th>Time</th>
                          <th>State</th>
                        </tr>
                      </thead>
                      <tbody>
                        {status.status.playerList.map((p, i) => (
                          <tr key={i}>
                            <td>{p.name}</td>
                            <td>
                              <Badge bg={p.ping < 50 ? 'success' : p.ping < 100 ? 'warning' : 'danger'}>
                                {p.ping}ms
                              </Badge>
                            </td>
                            <td>{p.loss}%</td>
                            <td>{p.time}</td>
                            <td>
                              <Badge bg={p.state === 'active' ? 'success' : 'secondary'}>
                                {p.state}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </>
                ) : (
                  <div className="text-muted text-center py-3">
                    No players currently connected
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-4">
                {status.error ? (
                  <div className="text-danger">{status.error}</div>
                ) : (
                  <div className="text-muted">Server is offline or unreachable</div>
                )}
              </div>
            )}
          </div>
        )}

        {selectedServerId && !status && loading && (
          <div className="text-center py-4">
            <Spinner animation="border" />
            <div className="mt-2">Loading server status...</div>
          </div>
        )}

        {!selectedServerId && (
          <div className="text-muted text-center py-4">
            Select a server to view stats
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default ServerStats;
