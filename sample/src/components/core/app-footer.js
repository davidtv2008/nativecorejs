/**
 * App Footer Component
 * Reusable footer
 */
import { Component, defineComponent } from '@core/component.js';
import { html } from '@core-utils/templates.js';
class AppFooter extends Component {
    template() {
        const year = new Date().getFullYear();
        return html `
            <footer class="app-footer">
                <div class="container">
                    <p>&copy; ${year} MyApp. All rights reserved.</p>
                    <div class="footer-links">
                        <a href="/privacy" data-link>Privacy</a>
                        <a href="/terms" data-link>Terms</a>
                    </div>
                </div>
            </footer>
        `;
    }
}
defineComponent('app-footer', AppFooter);
export default AppFooter;
