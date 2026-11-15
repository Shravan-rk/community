import { Router } from 'express';
import { LANGUAGES, ROLES, SCHEME_STATUSES } from '../lib/roles.js';

const router = Router();

router.get('/', (_req, res) => {
  res.json({
    service: 'GRAMA SAHAY API',
    version: '0.1.0',
    languages: LANGUAGES,
    roles: ROLES,
    schemeStatuses: SCHEME_STATUSES,
    schemeLevels: ['CENTRAL', 'STATE'],
    documentation: '/docs/API_DOCUMENTATION.md',
  });
});

export default router;
