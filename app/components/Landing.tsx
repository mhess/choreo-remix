import { Link } from "@remix-run/react";

export default () => {
	return (
		<div className="max-w-4xl mx-4">
			<h1>Welcome to the Choreo App!</h1>
			<p>Choreo is an app that helps you compose choreography to music.</p>
			<p>
				The app uses your Spotify premium account to set up a web player that
				allows you to annotate time points in a track while it's playing. You
				can use these annotations to navigate around the song easily. The app
				allows you to save these annotations to CSV files for later.
			</p>
			<p>
				<Link to="auth/login">Log in with your Spotify account</Link> to use the
				app.
			</p>
		</div>
	);
};
