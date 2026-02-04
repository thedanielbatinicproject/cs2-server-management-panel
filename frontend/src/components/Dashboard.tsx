import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Navbar, Nav, Button, Alert, Spinner, NavDropdown } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import ServerList from './ServerList';
import MapManager from './MapManager';
import PromptManager from './PromptManager';
import CommandConsole from './CommandConsole';
import ServerStats from './ServerStats';
import { servers as serversApi } from '../api';
import { BulkResult, Server } from '../types';
import { useAuth } from '../App';

interface ActionResult {
  type: 'success' | 'danger';
  message: string;
  details?: BulkResult[];
}

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [selectedServerIds, setSelectedServerIds] = useState<string[]>([]);
  const [actionResult, setActionResult] = useState<ActionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [serverList, setServerList] = useState<Server[]>([]);

  const canAccessUserManager = user && (user.role === 'superadmin' || user.role === 'admin' || user.isSuperuser);

  // Load servers for the stats component
  useEffect(() => {
    const loadServers = async () => {
      try {
        const res = await serversApi.list();
        setServerList(res.data);
      } catch (e) {}
    };
    loadServers();
  }, []);

  const handleChangeMap = async (mapName: string, workshopId: string | null, serverCommands: string[]) => {
    setLoading(true);
    setActionResult(null);
    try {
      const res = await serversApi.bulkChangeMap(selectedServerIds, mapName, workshopId, serverCommands);
      setActionResult({
        type: 'success',
        message: `Map changed on ${res.data.results.length} server(s)`,
        details: res.data.results,
      });
    } catch (e: any) {
      setActionResult({ type: 'danger', message: e.response?.data?.error || 'Failed to change map' });
    } finally {
      setLoading(false);
    }
  };

  const handleExecutePrompt = async (lines: string[]) => {
    setLoading(true);
    setActionResult(null);
    try {
      const res = await serversApi.bulkExecute(selectedServerIds, lines, { delay: 200, stopOnFail: false });
      setActionResult({
        type: 'success',
        message: `Executed on ${res.data.results.length} server(s)`,
        details: res.data.results,
      });
    } catch (e: any) {
      setActionResult({ type: 'danger', message: e.response?.data?.error || 'Failed to execute' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <>
      <Navbar bg="dark" variant="dark" expand="lg" className="mb-3">
        <Container>
          <Navbar.Brand as={Link} to="/">CS2 RCON Manager</Navbar.Brand>
          <Navbar.Toggle aria-controls="main-navbar" />
          <Navbar.Collapse id="main-navbar">
            <Nav className="me-auto">
              <Nav.Link as={Link} to="/">Dashboard</Nav.Link>
              {canAccessUserManager && (
                <Nav.Link as={Link} to="/users">User Management</Nav.Link>
              )}
            </Nav>
            <Nav>
              <NavDropdown title={user?.username || 'User'} align="end">
                <NavDropdown.Item disabled>
                  Role: {user?.role}{user?.isSuperuser ? ' (Superuser)' : ''}
                </NavDropdown.Item>
                <NavDropdown.Divider />
                <NavDropdown.Item onClick={handleLogout}>Logout</NavDropdown.Item>
              </NavDropdown>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
      <Container>
        {loading && (
          <div className="text-center my-3">
            <Spinner />
          </div>
        )}
        {actionResult && (
          <Alert variant={actionResult.type} dismissible onClose={() => setActionResult(null)}>
            {actionResult.message}
            {actionResult.details && (
              <ul className="mb-0 mt-2 small">
                {actionResult.details.map((d, i) => (
                  <li key={i}>
                    Server {d.serverId}: {d.error || (d.failed ? 'Partial' : 'OK')}
                  </li>
                ))}
              </ul>
            )}
          </Alert>
        )}
        <Row>
          <Col md={4}>
            <ServerList selectedIds={selectedServerIds} setSelectedIds={setSelectedServerIds} />
            <ServerStats servers={serverList} />
          </Col>
          <Col md={8}>
            <MapManager selectedServerIds={selectedServerIds} onChangeMap={handleChangeMap} />
            <PromptManager selectedServerIds={selectedServerIds} onExecute={handleExecutePrompt} />
            <CommandConsole selectedServerIds={selectedServerIds} />
          </Col>
        </Row>
      </Container>
    </>
  );
};

export default Dashboard;
