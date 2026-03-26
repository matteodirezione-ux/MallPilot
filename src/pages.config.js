/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import Calendario from './pages/Calendario';
import CalendarioManutenzioni from './pages/CalendarioManutenzioni';
import CalendarioVigilanza from './pages/CalendarioVigilanza';
import Clienti from './pages/Clienti';
import Dashboard from './pages/Dashboard';
import Documenti from './pages/Documenti';
import Gestione from './pages/Gestione';
import SpaziExpo from './pages/SpaziExpo';
import Task from './pages/Task';
import Ticket from './pages/Ticket';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Calendario": Calendario,
    "CalendarioManutenzioni": CalendarioManutenzioni,
    "CalendarioVigilanza": CalendarioVigilanza,
    "Clienti": Clienti,
    "Dashboard": Dashboard,
    "Documenti": Documenti,
    "Gestione": Gestione,
    "SpaziExpo": SpaziExpo,
    "Task": Task,
    "Ticket": Ticket,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};