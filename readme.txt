=== Really Simple Year Planner ===
Contributors: David Thompson
Donate link: https://gracechurchtogether.org.uk/give
Tags: year, planner, diary, events, schedule
Requires at least: 5.0
Tested up to: 5.7
Stable tag: 1.1.2
Requires PHP: 7.0
License: GPLv3 or later
License URI: http://www.gnu.org/licenses/gpl.html

This plugin provides a single view year planner. It is not trying to be a complete diary solution or events planner, but is simply there to give you all the weeks of the year in a single view. The ability to add coloured bars representing events in your year planner is a bonus!

== Description ==

The Really Simple Year Planner is intended to mimic a Year Planner that you might have on your office wall. The primary objective is to give you a year-to-a-view planner, enabling the user to get a sense of the broad passage of time, count off the weeks and highlight key events. Entries in the year planner are displayed as coloured bars, and each can be given a name and a colour. Depending on the plugin settings, users can be limited to a blank view of the year, have the ability to view all the planner entries, or have full ability to add/remove/edit entries. The Really Simple Year Planner is ideal for a personal website, company Intranet or public-facing events scheduling.

1. From the Admin settings, choose a default bar colour and the level of access privileges for those viewing your website (ie, none/view/edit).
2. Add the shortcode [yplDrawPlanner] to any page on your website. The year planner is designed to nearly fill the available display width, so a fullwidth page template works best.
3. Diary entries can be added via the backend using the Year Planner menu. As well as the name, start and end dates, this enables additional content to be attached and categories to be set.
4. Diary entries can be set to be recurring, in which case they will appear in ever year view.
5. Via the admin screen, diary entries can be duplicated from existing ones for simplicity.
6. On the year planner itself (ie, frontend), the current year is displayed by default. This can be overridden by including the year in the shortcode, eg, [yplDrawPlanner year="2025"].
7. Above the year planner, use the controls to advance to the next year or move backwards to the preceding year. Also, if edit rights have been set, use the 'plus' button to add a diary entry, or click on a bar to highlight an existing entry and click the 'minus' button to delete it. Alternatively, double-click on any day in the planner to create a new entry starting on that day. The start date, end date, bar colour and whether the entry should be recurring can all be set from the frontend.
8. Double-click on an existing diary entry to edit its details.
8. For the most uncluttered view, diary entry labels can be omitted via a setting in the admin settings.

== Installation ==

1. The plugin file is available on request from david.thompson@gracechurchtogether.org.uk, or simply install from within Wordpress.
2. For manual installation, unzip the file and copy the contents to your Wordpress plugin folder.
3. Within the Wordpress backend, go to the plugins page and Activate the plugin named Really Simple Year Planner. A menu item will appear on the Admin menu.
4. Go to settings within the Year Planner menu, and set the default bar colour and user access privileges. Also select if you wish labels to be displayed.
5. Create a page on your website for your year planner. Use a fullwidth page template.
6. Include on that page the shortcode [yplDrawPlanner]. (Optionally, you may specify the initial year to display as an argument, eg, [yplDrawPlanner year="2025"].)

== Screenshots ==

1. This is an example view of the Year Planner. The larger the monitor, the better it looks!
2. This is the settings page, allowing the user to set the default bar colour, select user view and/or edit rights, and select if labels should be displayed.
3. This is where all the diary entries are listed.
4. This is the dialog used to add a diary entry directly from the year planner.

== Changelog ==

= 1.1.2 (26 Feb 2021) =
* Fixed a bug preventing entry titles being updated from the frontend.

= 1.1.1 (24 Feb 2021) =
* 'Today' square now updates automatically.
* Fixed bug relating to screen resizing on Edge.
* Fixed bug relating to colour picker on Edge.

= 1.1.0 (17 Feb 2021) =
* Added ability to update diary entries from the frontend by double-clicking on bars.

= 1.0.2 (15 Feb 2021) =
* Added translation support.

= 1.0.1 (13 Feb 2021) =
* Fixed file referencing bug.

= 1.0.0 (05 Feb 2021) =
* **Initial release**