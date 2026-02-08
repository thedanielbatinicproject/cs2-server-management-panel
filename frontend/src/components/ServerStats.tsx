import React, { useState, useEffect, useCallback } from 'react';
import { Card, Form, Table, Badge, Spinner, Button } from 'react-bootstrap';
import { servers as serversApi, maps as mapsApi } from '../api';
import { Server, GameMap } from '../types';

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
  kills?: number;
  deaths?: number;
  assists?: number;
  score?: number;
}

interface ServerStatus {
  online: boolean;
  ping: number | null;
  status: {
    hostname: string;
    map: string;
    mapWorkshopId: string | null;
    mapDisplayName: string | null;
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
  const [mapsList, setMapsList] = useState<GameMap[]>([]);

  // Load maps for name lookup
  useEffect(() => {
    const loadMaps = async () => {
      try {
        const res = await mapsApi.list();
        setMapsList(res.data);
      } catch (e) {}
    };
    loadMaps();
  }, []);

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

  // Find map in our database by workshopId or name
  const findMapInfo = (rawMap: string, workshopId: string | null): { name: string; workshopId: string | null } | null => {
    // First try to match by workshop ID
    if (workshopId) {
      const byWorkshop = mapsList.find(m => m.workshopId === workshopId);
      if (byWorkshop) return { name: byWorkshop.name, workshopId: byWorkshop.workshopId };
    }
    
    // Try to match by map code name (e.g., de_mirage, aim_ancient)
    const mapCode = rawMap.split('/').pop() || rawMap;
    const byName = mapsList.find(m => 
      m.name.toLowerCase().includes(mapCode.toLowerCase()) ||
      mapCode.toLowerCase().includes(m.name.toLowerCase().replace(/\s+/g, '_'))
    );
    if (byName) return { name: byName.name, workshopId: byName.workshopId };
    
    return null;
  };

  const getMapDisplay = () => {
    if (!status?.status) return { displayName: 'Unknown', workshopId: null, rawName: null };
    
    const rawMap = status.status.map;
    const wsId = status.status.mapWorkshopId;
    
    // Backend provides mapDisplayName which is looked up from the maps database
    if (status.status.mapDisplayName) {
      return { 
        displayName: status.status.mapDisplayName, 
        workshopId: wsId, 
        rawName: rawMap !== status.status.mapDisplayName ? rawMap : null 
      };
    }
    
    // Frontend fallback: try to find in our local maps list
    const mapInfo = findMapInfo(rawMap, wsId);
    if (mapInfo) {
      return { displayName: mapInfo.name, workshopId: mapInfo.workshopId || wsId, rawName: rawMap };
    }
    
    // Final fallback: clean up the raw map name
    const cleanName = rawMap.split('/').pop() || rawMap;
    return { displayName: cleanName, workshopId: wsId, rawName: rawMap !== cleanName ? rawMap : null };
  };

  return (
    <Card className="mb-3">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <span>Server Stats</span>
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
            {loading ? <Spinner size="sm" animation="border" /> : 'Refresh'}
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
                        {(() => {
                          const mapDisplay = getMapDisplay();
                          return (
                            <>
                              <strong>{mapDisplay.displayName}</strong>
                              {mapDisplay.workshopId && (
                                <Badge bg="info" className="ms-2">
                                  Workshop: {mapDisplay.workshopId}
                                </Badge>
                              )}
                              {mapDisplay.rawName && mapDisplay.rawName !== mapDisplay.displayName && (
                                <small className="text-muted ms-2">({mapDisplay.rawName})</small>
                              )}
                            </>
                          );
                        })()}
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
                          <th>Score</th>
                          <th>K</th>
                          <th>D</th>
                          <th>A</th>
                          <th>Ping</th>
                          <th>Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {status.status.playerList.map((p, i) => (
                          <tr key={i}>
                            <td>{p.name}</td>
                            <td>{p.score !== undefined ? p.score : <span className="text-muted">-</span>}</td>
                            <td>{p.kills !== undefined ? p.kills : <span className="text-muted">-</span>}</td>
                            <td>{p.deaths !== undefined ? p.deaths : <span className="text-muted">-</span>}</td>
                            <td>{p.assists !== undefined ? p.assists : <span className="text-muted">-</span>}</td>
                            <td>
                              <Badge bg={p.ping < 50 ? 'success' : p.ping < 100 ? 'warning' : 'danger'}>
                                {p.ping}ms
                              </Badge>
                            </td>
                            <td>{p.time}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                    {status.status.playerList.some(p => p.kills === undefined) && (
                      <small className="text-muted">
                        Install RconStats plugin for K/D/A stats.
                      </small>
                    )}
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
