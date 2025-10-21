(() => {
	const FOOTER_HTML = `
<footer id="footer2025" class="footer-2025 mpl-footer-v3">
	<div class="mpl-footer-wrap">
		<div class="mpl-footer-grid" role="navigation" aria-label="Site footer">
			<section class="col brand">
				<div class="brandline">
					<span class="logo" aria-hidden="true">M</span>
					<div><b>M Share</b><div class="muted">Quiet, practical tools for mental health and wellbeing.</div></div>
				</div>
				<div class="mpl-pay" aria-label="Support links">
						<a class="pay-link" data-href="coffee.html" target="_blank" rel="noopener">Support Us</a>
					<a class="pay-link" href="https://buy.stripe.com/28E4gy5j6cmD2wu3pk4Rq00" target="_blank" rel="noopener">☕
							Support Us</a>
				</div>
			</section>

			<section class="col center">
				<!-- Theme Explorer (center) -->
				<div id="mpl-theme-slot" aria-label="Theme controls"></div>
			</section>

			<section class="col right">
				<!-- Explore menu (chevrons) -->
				<nav class="mpl-footer-explore" aria-label="Explore">
					<h4>Explore</h4>
					<div id="mpl-footer-explore"></div>
				</nav>
			</section>
		</div>

		<div class="bottom">
				<div>© <span id="yearFooter"></span> MindPayLink · Educational information only; not medical advice.</div>
				<div class="credit"><a id="backToTop" href="#top" aria-label="Back to top">Back to top ↑</a> · Designed by <b>Alkhadi M Koroma</b></div>
		</div>
	</div>
</footer>`;

	function applyFooter() {
		const footers = Array.from(document.querySelectorAll('footer'));
		if (footers.length) {
			footers.forEach((f, i) => { if (i > 0) f.remove(); });
			footers[0].outerHTML = FOOTER_HTML;
		} else {
			const d = document.createElement('div'); d.innerHTML = FOOTER_HTML; document.body.appendChild(d.firstElementChild);
		}

		// set year
		const y = document.getElementById('yearFooter');
		if (y) y.textContent = new Date().getFullYear();

		// back to top wiring
		const b = document.getElementById('backToTop') || document.querySelector('a[href="#top"]');
		if (b) b.addEventListener('click', e => { e.preventDefault(); try { (document.getElementById('top') || document.body).scrollIntoView({ behavior: 'smooth', block: 'start' }) } catch { location.hash = '#top'; } });
	}

	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyFooter, { once: true });
	else applyFooter();
})();
