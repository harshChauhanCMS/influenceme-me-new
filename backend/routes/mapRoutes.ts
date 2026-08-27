import {Router} from "express";
import {authenticate} from "../middleware/auth";
import {getPlaces} from "../controllers/mapController";

const router = Router();

// Search places (autocomplete) - Public endpoint, no auth required
// This allows location search during onboarding before user login
router
    .route('/places')
    .post(getPlaces);

// Other map routes can be added here with authentication if needed
// router.use(authenticate);
// router.route('/other-endpoint').post(handler);

export default router;
