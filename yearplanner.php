<?php
/**
 * Plugin Name: Really Simple Year Planner
 * Description: This plugin provides a single view year planner. It is not trying to be a complete diary solution or events planner, but is simply there to give you all the weeks of the year arranged in a single view. The ability to add coloured bars representing events in your year planner is a bonus!
 * Version: 1.1.2
 * Author: David Thompson
 * Author URI: https://davidthompson.blog
 * Text Domain: year-planner
 * License: GPLv3
 * License URI: https://www.gnu.org/licenses/gpl-3.0.html
 */

defined( 'ABSPATH' ) or die( 'Nope, not accessing this' );

class YearPlanner {

    public $saveconfirm;
    
    /*
     * Constructor
     */
    public function __construct() {

        add_action( 'init', array($this, 'create_post_type' ) );
        add_action( 'init', array($this, 'yplupdatesettings' ) );
        
        add_shortcode( 'yplDrawPlanner', array( $this, 'drawYearPlanner' ) );
        
        add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_ypl_scripts') );
        add_action( 'admin_enqueue_scripts', array( $this, 'ypl_enqueue_admin_scripts' ) );
        
        add_action( 'wp_ajax_ypl_submit_selection', array( $this, 'ypl_submit_selection' ) );
        add_action( 'wp_ajax_nopriv_ypl_submit_selection', array( $this, 'ypl_submit_selection' ) );   
        
        add_action( 'plugins_loaded', array($this, 'yplsettextdomain') );
        add_action( 'admin_init', array( $this, 'ypladmin_init' ) );
        add_action( 'save_post', array( $this, 'save_ypldata' ) );
        
        add_filter( "manage_edit-ypl-plannerentry_columns", array( $this, "ypl_edit_columns" ) );
        add_action( "manage_posts_custom_column",  array( $this, "ypl_custom_columns" ) );

        add_filter( 'post_row_actions', array( $this, 'ypl_duplicate_post_link' ), 10, 2 );   
        add_action( 'admin_action_ypl_duplicate_post', array( $this, 'ypl_doduplication' ) );
        
        add_action( 'admin_menu', array( $this, 'yplsetupmenu' ) );
        
        $this->saveconfirm = 0;
        add_option( 'yplYear', '2021' );
        add_option( 'yplCanView', true );
        add_option( 'yplCanEdit', false );
        add_option( 'yplDefaultColor', '#1e73be' );
        add_option( 'yplViewLabels', true );
    }	

    /**
     * Register the custom post type.
     */
    public function create_post_type() {
        register_post_type( 'ypl-plannerentry',
            array(
                'labels' => array(
                    'name' => __( 'Planner Entries', 'year-planner' ),
                    'singular_name' => __( 'Planner Entry', 'year-planner' ),
                    'menu_name' => __( 'Year Planner', 'year-planner' ),
                    'all_items' => __( 'All Entries', 'year-planner' ),
                ),
                'public' => true,
                'has_archive' => true,
                'supports' => array( 'title', 'editor', 'thumbnail' ),
                'menu_icon' => 'dashicons-calendar',
            )
        );
        
        register_taxonomy( 'ypl_category', 
            'ypl-plannerentry',
            array(
                'hierarchical' => true,
                'labels' => array(
                    'name' => 'Planner Category',
                    'singular_name' => 'Planner Category',
                )
            )
        );
    }
    
    /**
     * Enqueue main script and style files.
     */
    public function enqueue_ypl_scripts() {
        $ajax_url = admin_url( 'admin-ajax.php' );        // Localized AJAX URL

        wp_register_script( 'ypl-script', plugins_url( 'js/yearplanner.js', __FILE__ ), array('jquery'), '1.0', true );
    
        // Localise AJAX variables. Do NOT use ajax_obj as var name, ie, make it unique to this context.
        wp_localize_script( 'ypl-script', 'ypl_ajax_obj', array( 
            'ajax_url' => $ajax_url,
            'security' => wp_create_nonce( 'ypl-security-nonce' ) )        // for nonce, ensure that script is enqueued/registered prior to localize
        );
                         
        $current_user = wp_get_current_user();
        $setcanedit = current_user_can('editor') || current_user_can('administrator') || get_option( 'yplCanEdit' );

        // Variables accessed by page scripts
        $dataToBePassed = array (
            'year'          => get_option( 'yplYear' ),  
            'defaultcolor'  => get_option( 'yplDefaultColor' ),
            'canedit'       => $setcanedit,
            'canview'       => (get_option( 'yplCanView' ) || is_user_logged_in()),
            'showtitles'    => get_option( 'yplViewLabels' ),
        );
        wp_localize_script( 'ypl-script', 'ypl_vars', $dataToBePassed );
        
        // Strings displayed by page scripts which we have pre-translated
        $translation = array (
            'submit'        => esc_attr__( 'Submit', 'year-planner' ),
            'update'        => esc_attr__( 'Update', 'year-planner' ),
        );
        wp_localize_script( 'ypl-script', 'ypl_translate', $translation );
        
        wp_enqueue_script( 'ypl-script' );
        
        wp_register_style( 'ypl-style', plugins_url( 'css/yearplanner.css', __FILE__ ) );
        wp_enqueue_style( 'ypl-style' ); 
    }
    
    /**
     * Enqueue the admin script and style files. 
     */
    public function ypl_enqueue_admin_scripts( $hook ) {
        global $post;

        if ( $hook == 'post-new.php' || $hook == 'post.php' ) {
            if ( 'ypl-plannerentry' === $post->post_type ) {     
                wp_enqueue_style( 'wp-color-picker' );
                wp_enqueue_script( 'ypl-admin-handle', plugins_url('js/ypl-admin.js', __FILE__ ), array( 'wp-color-picker' ), false, true );

                wp_register_style( 'ypl-admin-style', plugins_url( 'css/ypl-admin.css', __FILE__ ) );
                wp_enqueue_style( 'ypl-admin-style' ); 
            }
        }
        
        if ( $hook == 'ypl-plannerentry_page_ypl-menu' ) {
            wp_register_style( 'ypl-admin-style', plugins_url( 'css/ypl-admin.css', __FILE__ ) );
            wp_enqueue_style( 'ypl-admin-style' );             
        }
    }
    
    /**
     * Register the text domain and source folder for language translation.
     */
    public function yplsettextdomain() {
        load_plugin_textdomain( 'year-planner', false, dirname( plugin_basename( __FILE__ ) ) . '/languages' );
    }
    
    /**
     * Add admin submenu item. This allows the user to set options relating to the plugin and read some instructions.
     */
    public function yplsetupmenu() {
        add_submenu_page( 'edit.php?post_type=ypl-plannerentry', 'Year Planner Settings', 'Settings', 'manage_options', 'ypl-menu', array($this, 'yplsettingspage') );
    }
    
    /**
     * Render the admin settings page.
     */
    public function yplsettingspage() {
        if ( !current_user_can( 'manage_options' ) )  {
            wp_die( __( 'You do not have sufficient permissions to access this page.', 'year-planner' ) );
        }
        
        $plugin_data = get_plugin_data( __FILE__ );
        $plugin_name = $plugin_data['Name'];
        ?>
            <h1><?php echo esc_attr( $plugin_name ); ?></h1>
            <p>
            Welcome to the Year Planner plugin by David Thompson which, like David, is designed to be really simple!<br><br>
            Year Planner entries are added as posts or from the Year Planner itself.<br>Add the shortcode <strong>[yplDrawPlanner]</strong> to a page on the website. (A fullwidth page template is best.)<br><br>
            You can also set the initial year to display via an option in the shortcode, eg, [yplDrawPlanner year="2025"]. The current year is displayed by default.<br><br>
            From the Year Planner you can add or delete planner entries and move forwards/backwards to different years.<br><br><br>
            </p>
        <?php

        $pageURL = 'http';
   		if ($_SERVER["HTTPS"] == "on") $pageURL .= "s";
   		$pageURL .= "://";
   		if ($_SERVER["SERVER_PORT"] != "80") $pageURL .= $_SERVER["SERVER_NAME"].":".$_SERVER["SERVER_PORT"].$_SERVER["REQUEST_URI"];
   		else $pageURL .= $_SERVER["SERVER_NAME"].$_SERVER["REQUEST_URI"];
   		$current_url = $pageURL;

        $yplcolor = get_option( 'yplDefaultColor' );
        if ( !$yplcolor || !$this->isokcolor($yplcolor) ) {
            $yplcolor = '#1e73be';
            update_option( 'yplDefaultColor', $yplcolor );
        }
        $yplcanview = get_option( 'yplCanView' );
        $yplcanedit = get_option( 'yplCanEdit' );
        $yplviewlabels = get_option( 'yplViewLabels' );
        $yplyear = get_option( 'yplYear' );
        if ( !$yplyear ) {
            $yplyear = '2021';
            update_option( 'yplYear', $yplyear );
        }
        
        ?>
        <div class="ypladminsettings">
            <form class="ypladminform" method="POST" action="<?php echo esc_url($current_url); ?>">
                <div class="yplformrow">
                <label for="defcolor"><?php _e('Default bar colour', 'year-planner'); ?></label>
                <input type="color" id="defcolor" name="defcolor" value="<?php echo esc_attr($yplcolor); ?>" />
                </div>
                <br>
                <br>
                <div class="yplformrow" id="viewlabelsrowid">
                <label for="viewlabels">Display labels</label>
                <input type="checkbox" class="ypladmincheckbox" id="viewlabels" name="viewlabels" value="viewlabels" <?php echo ( $yplviewlabels ? esc_attr('checked') : '' ); ?>/>
                </div>
                <br>
                <br>
                <p>All webpage visitors can do this for all Year Planner entries:</p>
                <br>
                <div class="yplformrow" id="canviewrowid">
                <label for="canview">View</label>
                <input type="checkbox" class="ypladmincheckbox" id="canview" name="canview" value="canview" <?php echo ( $yplcanview ? esc_attr('checked') : '' ); ?>/>
                </div>
                <br>
                <div class="yplformrow">
                <label for="canedit">Edit</label>
                <input type="checkbox" class="ypladmincheckbox" id="canedit" name="canedit" value="canedit" <?php echo ( $yplcanedit ? esc_attr('checked') : '' ); ?>/>
                </div>
                <br>
                <br>
                <input type="hidden" name="yplaction" value="yplupdate"/>
                <input type=hidden name="ypl_nonce" value="<?php echo esc_attr(wp_create_nonce( 'ypl-nonce-key' )); ?>"/>

                <input type="submit" id="settingssavebtn" class="btn btn-primary" value="Save">

            </form>

        <?php
            // This is set up to add more message in the future. Fow now... 0 = nothing to display; 1 = successful save; 2+ = error.
            switch ( $this->saveconfirm ) {
                case 1:
                    $msg = 'Your settings have been saved!';
                    break;
                default:
                    $msg = 'Unkonwn message code!';
            }
            if ( $this->saveconfirm == 1 ) : ?>
                <p style="color:green; padding-top:30px;"><?php echo esc_attr($msg); ?></p>
            <?php
                $this->saveconfirm = 0;
            elseif ( $this->saveconfirm > 1 ) : ?>
                <p style="color:red; padding-top:30px;"><?php echo esc_attr($msg); ?></p>
            <?php
                $this->saveconfirm = 0;
            endif;
            ?>
        </div>
        <?php
    }
    
    /**
    * Process the admin settings when saved.
    */
    public function yplupdatesettings() {
        if ( isset($_POST['yplaction']) ) {
            $yplaction = sanitize_text_field( $_POST['yplaction'] );
            
            // Stop as soon as possible if we have no form to process
            if ( !is_user_logged_in() || $yplaction != 'yplupdate' )
                return;
            
            // Stop as soon as possible if the nonce doesn't check out
            if ( !wp_verify_nonce( $_POST['ypl_nonce'], 'ypl-nonce-key' ) )
                return;
            
            if ( isset( $_POST['defcolor'] ) ) {
                $defcolor = sanitize_text_field( $_POST['defcolor'] );
                if ( $this->isokcolor($defcolor) ) {
                    update_option( 'yplDefaultColor', $defcolor );
                }
                else {
                    $this->saveconfirm = 2;     // Error value
                }
            }
            
            if ( isset( $_POST['viewlabels'] ) ) {
                update_option( 'yplViewLabels', true );
            }
            else {
                update_option( 'yplViewLabels', false );                
            }

            if ( isset( $_POST['canview'] ) ) {
                update_option( 'yplCanView', true );
            }
            else {
                update_option( 'yplCanView', false );                
            }

            if ( isset( $_POST['canedit'] ) ) {
                update_option( 'yplCanEdit', true );
            }
            else {
                update_option( 'yplCanEdit', false );                
            }

            // If no error code has been set, change code to 'Everything OK' so that message is displayed on page load
            if ( $this->saveconfirm == 0 ) {
                $this->saveconfirm = 1;
            }
        }
    }

  
    /**
     * Manage columns filter is hooked and the columns we want to display in our post list is set here. 
     */
    public function ypl_edit_columns($columns){
            $columns = array(
                "cb" => "<input type=\"checkbox\" />",
                "title" => __("Entry Name", 'year-planner'),
                "startdate" => __("Start Date", 'year-planner'),
                "enddate" => __("End Date", 'year-planner'),
                "recurring" => __("Recurring", 'year-planner'),
                "color" => __("Colour", 'year-planner'),
                "date" => __("Date", 'year-planner'),
            );

            return $columns;
    }

    /**
    * Manage columns action is hooked and this function called to set up columns
    */
   public function ypl_custom_columns($column){
            global $post;
        
            $allowedline = array(
                'div'    => array( 'class' => array(), 'style' => array() ),
            );

            switch ($column)
            {
                case "description":
                    the_excerpt();
                    break;
                case "startdate":
                    $custom = get_post_custom();
                    echo esc_attr( $custom["_startdate"][0] );
                    break;
                case "enddate":
                    $custom = get_post_custom();
                    echo esc_attr( $custom["_enddate"][0] );
                    break;
                case "recurring":
                    $custom = get_post_custom();
                    $rec = $custom["_recurring"][0] ? 'yes' : 'no';
                    echo esc_attr( $rec );
                    break;
                case "color":
                    // Display the colour as a coloured box
                    $custom = get_post_custom();
                    $yplcolor = $custom["_yplcolor"][0];
                    $colstr = '<div class="yplcolumncolor" style="width:35px;height:18px;border:black 1px solid;background-color:' . esc_attr($yplcolor) . ';"></div>';
                    echo wp_kses( $colstr, $allowedline );                    
                    break;
            }
    }
 
    /**
     * At the metadata box for the custom fields to the post edit page.
     */
    public function ypladmin_init() {
        add_meta_box("yplentry-meta", "Year Planner Entry", array( $this, "meta_options" ), "ypl-plannerentry", "normal", "low");
    }    
     
    /**
     * Callback function to draw meta box on the current post edit page.
     */
    public function meta_options() {
        global $post;
        $custom = get_post_custom($post->ID);
        $startdate = isset($custom["_startdate"]) ? $custom["_startdate"][0] : "";      // prefixing name with '_' prevents them appearing in custom data 
        $enddate = isset($custom["_enddate"]) ? $custom["_enddate"][0] : "";      
        $recurring = isset($custom["_recurring"]) ? $custom["_recurring"][0] : false;
        $yplcolor = isset($custom["_yplcolor"]) ? $custom["_yplcolor"][0] : "#1e73be";  // default to a nice blue colour          
?>
    <div class="yplmetafield date"><label>Start Date:</label><input type="date" name="stdate" id="yplstdateid" value="<?php echo esc_attr($startdate); ?>" /></div>
    <div class="yplmetafield date"><label>End Date:</label><input type="date" name="endate" id="yplendateid" value="<?php echo esc_attr($enddate); ?>" /></div>
    <div class="yplmetafield"><label>Recurring:</label><input type="checkbox" name="recurring" value="true" <?php echo $recurring ? 'checked' : ''; ?> /></div>
    <div class="yplmetafield"><label>Colour:</label><input name="yplcol" class="ypl-color-field" value="<?php echo esc_attr($yplcolor); ?>" /></div>
<?php
    }
 
    /**
     * Action hook: save_post. Save the contents of the metabox to the post meta.
     */
    public function save_ypldata( $post_id ){
        // handle the case when the custom post is quick edited
        // otherwise all custom meta fields are cleared out
        if ( isset( $_POST['_inline_edit'] ) && wp_verify_nonce(sanitize_text_field($_POST['_inline_edit']), 'inlineeditnonce'))
            return;
        
        if( isset( $_POST ) && ! empty( $_POST ) ) {
            $stdate = sanitize_text_field( $_POST["stdate"] );
            $endate = sanitize_text_field( $_POST["endate"] );
            $recurr = sanitize_text_field( $_POST["recurring"] );
            $yplcol = sanitize_text_field( $_POST["yplcol"] );

            update_post_meta($post_id, "_startdate", $stdate);
            
            // Do not allow the end date to be before the start date - make it a single-day entry instead
            if ( date_create($stdate) > date_create($endate) ) {
                $endate = $stdate;
            }            
            update_post_meta($post_id, "_enddate", $endate);
            
            if ( isset( $_POST['recurring'] ) ) {
                update_post_meta($post_id, "_recurring", true);
            }
            else {
                update_post_meta($post_id, "_recurring", false);
            }
            
            update_post_meta($post_id, "_yplcolor", $yplcol);
        }
    }
    
    
    /**
     * Main shortcode function to draw year planner on the page.
     */
    public function drawYearPlanner( $atts='' ) {        
        $monthnames = [
            __('Jan', 'year-planner'),
            __('Feb', 'year-planner'),
            __('Mar', 'year-planner'),
            __('Apr', 'year-planner'),
            __('May', 'year-planner'),
            __('Jun', 'year-planner'),
            __('Jul', 'year-planner'),
            __('Aug', 'year-planner'),
            __('Sep', 'year-planner'),
            __('Oct', 'year-planner'),
            __('Nov', 'year-planner'),
            __('Dec', 'year-planner')
        ];
        
        // override default attributes with user attributes. Currently 'year' is the only possible attribute, but set up to easilly add more if required.
        $ypl_atts = shortcode_atts(
            array(
                'year' => date("Y"),
            ), $atts
        );
        $year = intval( sanitize_text_field( $ypl_atts['year'] ) );
        $min = 1900;
        $max = 2300;
        if (filter_var($year, FILTER_VALIDATE_INT, array("options" => array("min_range"=>$min, "max_range"=>$max))) === false) {
            $year = 2020;
        }
        update_option( 'yplYear', strval($year) );
                
        $startdate = date_create( get_option('yplYear') . '-01-01' );
        $thisdate = clone $startdate;
        
        $today = date_create()->format('Y-m-d');
        
        ob_start();

        // Include the html for the 'Add entry' form and the control buttons
        include ( plugin_dir_path( __FILE__ ) . 'yplform.php' );
        
        echo '<div class="yplcontainer" id="yplcontainerid">';
        for ($mth= 0; $mth < 12; $mth++) {
            echo '<div class="yplmonth">';
            echo '<div class="yplmonthlabel"><div class="yplmonthlabelinner rotatel">' . esc_attr($monthnames[$mth]) . '</div></div>';

            for ($col = 0; $col < 37; $col++) {
                echo '<div class="yplday"></div>';
            }
            
            echo '<div class="yplmonthlabel"><div class="yplmonthlabelinner rotater">' . esc_attr($monthnames[$mth]) . '</div></div>';
            echo '</div>';
        }
        echo '</div>';
        
        return ob_get_clean();
    }
    
    /**
     * Ajax handler function
     */
    public function ypl_submit_selection() {
        // Ensure we have the data we need to continue
        if( ! isset( $_POST ) || empty( $_POST ) ) {
            wp_send_json_error( 'Could Not Verify POST Values.' );
            wp_die();
        }
        
        // Check if we are allowed to send data for viewing
        if ( !is_user_logged_in() && !get_option( 'yplCanView' ) ) {
            wp_send_json_success( 'No entries to send' );
            wp_die();
        }
        
        // Check security nonce
        if ( ! check_ajax_referer( 'ypl-security-nonce', 'security', false ) ) {
            wp_send_json_error( 'Invalid security token sent.' );
            wp_die();
        }
        
        // Sanitize our user meta value
        $mode = sanitize_text_field( $_POST['mode'] );
        
        if ( $mode == '30' ) {
            // This mode is indicate that we need to delete an entry from the database (and then return all entries to client)
            
            // Check we are allowed to edit the database
            $current_user = wp_get_current_user();
            if ( current_user_can('editor') || current_user_can('administrator') || get_option( 'yplCanEdit' ) ) {
            
                if ( isset( $_POST['data'] ) ) {
                    $delidstr = sanitize_text_field( $_POST['data'] );
                }
                else {
                    wp_send_json_error( 'No POST data found.' );
                    wp_die();                           
                }

                $delid = intval(substr( $delidstr, 4 ));

                // For some reason, wp_update_post and wp_trash_post are deleting metadata, so we need to save it and reapply after move to trash.
                // Content and categories are preserved OK. Alternative would be to use wp_delete_post, which seems to be ignoring $force_delete
                // flag and permanently deleting anyway!
                $startdate = get_post_meta( $delid, '_startdate', true );
                $enddate = get_post_meta( $delid, '_enddate', true );
                $recurring = get_post_meta( $delid, '_recurring', true );
                $color = get_post_meta( $delid, '_yplcolor', true );            

                $update= array(
                    'ID'            => $delid,
                    'post_status'   => 'trash',
                );
                wp_update_post( $update );

                update_post_meta($delid, "_startdate", $startdate);
                update_post_meta($delid, "_enddate", $enddate);
                update_post_meta($delid, "_recurring", $recurring);
                update_post_meta($delid, "_yplcolor", $color);
            }
        }
        
        if ( $mode == '40' ) {
            // This mode (40) is for the update of a single entry, but is then followed by the sending of all entries

            // Check we are allowed to edit the database
            $current_user = wp_get_current_user();
            if ( current_user_can('editor') || current_user_can('administrator') || get_option( 'yplCanEdit' ) ) {
            
                if ( isset( $_POST['data'] ) ) {
                    $entry = json_decode( stripslashes( html_entity_decode( $_POST['data'] )));
                }
                else {
                    wp_send_json_error( 'No POST data found.' );
                    wp_die();                           
                }

                $start = sanitize_text_field( $entry->startdate );
                $end = sanitize_text_field( $entry->enddate );
                $yplcolor = sanitize_text_field( $entry->yplcolor );
                $recurring = sanitize_text_field( $entry->recurring );
                $title = sanitize_text_field( $entry->title );
                $targetid = intval( sanitize_text_field( $entry->id ) );

                // Validation checks
                if ( !$this->validateDates( $start, $end ) ) {
                    wp_send_json_error( 'Invalid dates supplied.' );
                    wp_die();                                               
                }
                if ( !$this->isokcolor( $yplcolor ) ) {
                    wp_send_json_error( 'Invalid colour supplied.' );
                    wp_die();                                                                   
                }
                if ( !is_int($targetid) || $targetid <= 0 ) {
                    wp_send_json_error( 'Invalid post ID.' );
                    wp_die();                                                                                       
                }
                
                $targetpost = get_post( $targetid );
                if ( !$targetpost ) {
                    wp_send_json_error( 'Unable to find post with that ID.' );
                    wp_die();                                                                                                           
                }
                
                // Update the title
                $post_info = array(
                  'ID'           => $targetid,
                  'post_title'   => $title,
                );
                $status = wp_update_post( $post_info, true );
                if ( is_wp_error($targetid) ) {
                    wp_send_json_error( $status );
                    wp_die();
                }
                
                // Update post metadata
                update_post_meta( $targetid, "_startdate", $start );
                update_post_meta( $targetid, "_enddate", $end );
                update_post_meta( $targetid, "_recurring", $recurring );
                update_post_meta( $targetid, "_yplcolor", $yplcolor );
            }

        }
        
        if ( $mode == '10' || $mode == '30' || $mode == '40' ) {
            // This mode (10) is for a read-only requst for year planner entry data, but also executed after post delete (mode 30)
            // and post update (mode 40)
            $args = array(
                'post_type' => 'ypl-plannerentry',
                'post_status' => array( 'publish' ),
                'posts_per_page' => -1,
            );

            $loop = new WP_Query( $args );
                   
            if ( isset( $_POST['year'] ) ) {
                $currentyear = sanitize_text_field( $_POST['year'] );
            }
            else {
                wp_send_json_error( 'No YEAR data found.' );
                wp_die();                           
            }

            while ( $loop->have_posts() ) {
                $loop->the_post();
                $pid = get_the_ID();
                $title = get_the_title();
                $startdate = get_post_meta( $pid, '_startdate', true );
                $enddate = get_post_meta( $pid, '_enddate', true );
                if ( !$this->validateDates( $startdate, $enddate) ) {
                    wp_send_json_error( 'Invalid date(s) obtained from server.' );
                    wp_die();                           
                }
                $recurring = get_post_meta( $pid, '_recurring', true );
                
                // Check that entry starts in the current year. Otherwise, ignore.
                $sdyear = date_create($startdate)->format('Y');
                if ( $sdyear === $currentyear || $recurring ) {    
                    // Get remaining data and add array entry for return to client
                    $colour = get_post_meta( $pid, '_yplcolor', true );
                    if ( !$this->isokcolor($colour) ) {
                        wp_send_json_error( 'Invalid colour obtained from server.' );
                        wp_die();                                                   
                    }

                    $entries[] = array(
                        'startdate' => $startdate,
                        'enddate' => $enddate,
                        'recurring' => $recurring,
                        'yplcolor' => $colour,
                        'title' => $title,
                        'id' => $pid
                    );
                }
            }

            if ( isset( $entries ) ) {
                wp_send_json_success( $entries );
                wp_die();                           
            }
            else {
                wp_send_json_success( 'No entries to send' );
                wp_die();
            }
//            echo json_encode( $entries );
//            exit;    
        }
        else if ( $mode == '20' ) {
            // This mode is to add a new planner entry to database
            
            $current_user = wp_get_current_user();
            $new_post_author = $current_user->ID;

            if ( current_user_can('editor') || current_user_can('administrator') || get_option( 'yplCanEdit' ) ) {

                if ( isset( $_POST['data'] ) ) {
                    $entry = json_decode( stripslashes( html_entity_decode( $_POST['data'] )));
                }
                else {
                    wp_send_json_error( 'No POST data found.' );
                    wp_die();                           
                }

                $start = sanitize_text_field( $entry->startdate );
                $end = sanitize_text_field( $entry->enddate );
                $yplcolor = sanitize_text_field( $entry->yplcolor );
                $recurring = sanitize_text_field( $entry->recurring );
                $title = sanitize_text_field( $entry->title );

                // Validation checks
                if ( !$this->validateDates( $start, $end ) ) {
                    wp_send_json_error( 'Invalid dates supplied.' );
                    wp_die();                                               
                }
                if ( !$this->isokcolor( $yplcolor ) ) {
                    wp_send_json_error( 'Invalid colour supplied.' );
                    wp_die();                                                                   
                }

                // new post data array
                $args = array(
                    'post_author'    => $new_post_author,
                    'post_content'   => "",
                    'post_status'    => 'publish',
                    'post_title'     => $title,
                    'post_type'      => 'ypl-plannerentry',
                );

                // insert the post into the database
                $new_post_id = wp_insert_post( $args );

                // Add meta values
                update_post_meta($new_post_id, "_startdate", $start);
                update_post_meta($new_post_id, "_enddate", $end);
                update_post_meta($new_post_id, "_recurring", $recurring);
                update_post_meta($new_post_id, "_yplcolor", $yplcolor);

                wp_send_json_success( $new_post_id );
                wp_die();                           
            }
            else {
                wp_send_json_error( 'You are not authorised to edit entries.' );
                wp_die();                           
            }
        }
        else {
            wp_send_json_error( 'Unallowed mode.' );
            wp_die();           
        }
    }
 
    /**
     * Add 'duplicate' link to each post entry
     */
    public function ypl_duplicate_post_link( $actions, $post ) {
        if ($post->post_type=='ypl-plannerentry' && current_user_can('edit_posts')) {
            $actions['duplicate'] = '<a href="' . wp_nonce_url('admin.php?action=ypl_duplicate_post&post=' . $post->ID, basename(__FILE__), 'duplicate_nonce' ) . '" title="Duplicate this item" rel="permalink">Duplicate</a>';
        }
        return $actions;
    }

    /**
     * Create a new post, copying all data from the passed in post
     */
    public function ypl_doduplication() {
        global $wpdb;
        if (! ( isset( $_GET['post']) || isset( $_POST['post'])  || ( isset($_REQUEST['action']) && 'rd_duplicate_post' == $_REQUEST['action'] ) ) ) {
            wp_die('No post to duplicate has been supplied!');
        }

        // Nonce verification
        if ( !isset( $_GET['duplicate_nonce'] ) || !wp_verify_nonce( $_GET['duplicate_nonce'], basename( __FILE__ ) ) )
            return;

        // get the original post id and data
        $post_id = (isset($_GET['post']) ? absint( $_GET['post'] ) : absint( $_POST['post'] ) );
        $post = get_post( $post_id );

        $current_user = wp_get_current_user();
        $new_post_author = $current_user->ID;

        // if post data exists, create the post duplicate
        if (isset( $post ) && $post != null) {

            // new post data array
            $args = array(
                'comment_status' => $post->comment_status,
                'ping_status'    => $post->ping_status,
                'post_author'    => $new_post_author,
                'post_content'   => $post->post_content,
                'post_excerpt'   => $post->post_excerpt,
                'post_name'      => $post->post_name,
                'post_parent'    => $post->post_parent,
                'post_password'  => $post->post_password,
                'post_status'    => 'draft',
                'post_title'     => $post->post_title,
                'post_type'      => $post->post_type,
                'to_ping'        => $post->to_ping,
                'menu_order'     => $post->menu_order
            );

            // insert the post into the database
            $new_post_id = wp_insert_post( $args );

            // get all current post terms ad set them to the new post draft
            $taxonomies = get_object_taxonomies($post->post_type); // returns array of taxonomy names for post type, ex array("category", "post_tag");
            foreach ($taxonomies as $taxonomy) {
                $post_terms = wp_get_object_terms($post_id, $taxonomy, array('fields' => 'slugs'));
                wp_set_object_terms($new_post_id, $post_terms, $taxonomy, false);
            }

            // duplicate all post meta just in two SQL queries
            /*
            $post_meta_infos = $wpdb->get_results("SELECT meta_key, meta_value FROM $wpdb->postmeta WHERE post_id=$post_id");
            if (count($post_meta_infos)!=0) {
                $sql_query = "INSERT INTO $wpdb->postmeta (post_id, meta_key, meta_value) ";
                foreach ($post_meta_infos as $meta_info) {
                    $meta_key = $meta_info->meta_key;
                    if( $meta_key == '_wp_old_slug' ) continue;
                    $meta_value = addslashes($meta_info->meta_value);
                    $sql_query_sel[]= "SELECT $new_post_id, '$meta_key', '$meta_value'";
                }
                $sql_query.= implode(" UNION ALL ", $sql_query_sel);
                $wpdb->query($sql_query);
            }
            */
            // Let's do this manually for this plugin, as we know which metafields we are going duplicate
            $startdate = get_post_meta( $post_id, '_startdate', true );
            $enddate = get_post_meta( $post_id, '_enddate', true );
            $recurring = get_post_meta( $post_id, '_recurring', true );
            $color = get_post_meta( $post_id, '_yplcolor', true );
            update_post_meta($new_post_id, "_startdate", $startdate);
            update_post_meta($new_post_id, "_enddate", $enddate);
            update_post_meta($new_post_id, "_recurring", $recurring);
            update_post_meta($new_post_id, "_yplcolor", $color);

            // Finally, redirect to the post list page
            wp_redirect( admin_url( 'edit.php?post_type=ypl-plannerentry' ) );
            exit;
        } else {
            wp_die('Post creation failed, could not find original post: ' . $post_id);
        }
    }
 
    private function validateDates( $st, $en ) {
        if ( !$this->isDate($st) || !$this->isDate($en) ) {
            return false;
        }
        if ( date_create($st) > date_create($en) ) {
            return false;
        }
        return true;
    }
    
    private function isDate($value) {
        if (!$value) {
            return false;
        }

        try {
            new \DateTime($value);
            return true;
        } catch (\Exception $e) {
            return false;
        }
    }
    
        /**
     * Check if string is a valid hex color code
     */
    private function isokcolor( $color ) {
        //Check for a hex color string '#c1c2b4'. Preceding # is optional.
        
        $hexok = false;
        if(preg_match('/^#[a-f0-9]{6}$/i', $color)) //hex color is valid
        {
            //Verified hex color
            $hexok = true;
        } 

        //Check for a hex color string without hash 'c1c2b4'
        elseif(preg_match('/^[a-f0-9]{6}$/i', $color)) //hex color is valid
        {
            //Verified hex color (no preceding #)
            $hexok = true;
        }
            
        return $hexok;
    }

        
    
/////
//  END OF CLASS DEF
/////    
}

$YearPlanner = new YearPlanner;

?>