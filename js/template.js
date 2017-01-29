$( document ).ready( function(){
    let allowed = [ 'admin', 'superadmin' ];
    // Loading Page Contents Using URL
    let url = window.location.href.split( '#' );
    loadHTML( url[ 1 ] );

    let target = window.location.href.split( '/' );
    target      = target[ (target.length - 1) ];

    if ( target !== 'login.html' ) {

        setTimeout( function () {
            if ( $.session.get( 'type' ) === 'superadmin' || $.session.get( 'type' ) === 'admin' ) {
                $( '#admin-menu' ).html(
                    `<li><a href="http://kd.sigconert.com/test/pages/users.html"></a></li>
                    <li><a href="http://kd.sigconert.com/test/pages/category.html">Categories</a></li>
                    <li><a href="http://kd.sigconert.com/test/pages/addmeal.html">Add meal</a></li>
                    <li><a href="http://kd.sigconert.com/test/pages/adddrink.html">Add drink</a></li>
                    <li><a href="http://kd.sigconert.com/test/pages/allsales.html">All Sales</a></li>`
                );
            }
            $( '#user-dash' ).text( $.session.get( 'firstName' ) + "'s" );
        }, 500 );
    }

    let targets = [ 'login.html', 'addsales.html' ];

    if ( targets.indexOf( target ) === -1 ) {
        // Add float Icon to pages
        $( 'body' ).prepend( `
            <div class="fixed-action-btn">
                <a href="http://kd.sigconert.com/test/pages/addsales.html" class="btn-floating btn-large red">
                    <i class="large material-icons">mode_edit</i>
                </a>
            </div>` );
    }

    if ( target === 'addmeal.html' && ( allowed.indexOf(  $.session.get( 'type' ) ) >= 0 ) ) {
        filterDataFromFirebase( 'categories', 'assigned_to', 'Meals', snap => {
            let categories = '<option value="">Select category</option>';

            snap.forEach( child => {
                categories += `<option value="`+ child.val( ).name+`">`+ child.val( ).name +`</option>`;
            });

            $( '#meal_category' ).empty( ).append( categories ).material_select( );
        });

        loadDataFromFirebase( 'meals', '', snap => {
            populateMealsTable( snap );
        });

    } else if ( target === 'category.html' && ( allowed.indexOf(  $.session.get( 'type' ) ) >= 0 ) ) {

        loadDataFromFirebase( 'categories', '', snap => {
            populateCategoryTable( snap );
        });
    }   else if ( target === 'adddrink.html' && ( allowed.indexOf(  $.session.get( 'type' ) ) >= 0 ) ) {

        filterDataFromFirebase( 'categories', 'assigned_to', 'Drinks', snap => {
            let categories = '<option value="">Select category</option>';

            snap.forEach( child => {
                categories += `<option value="`+ child.val( ).name+`">`+ child.val( ).name+`</option>`;
            });

            $( '#drink_category' ).empty( ).append( categories ).material_select( );
        });

        loadDataFromFirebase( 'drinks', '', snap => {
            populateDrinksTable( snap );
        });

    }   else if ( target === 'addsales.html' ) {

        childAdded( 'sales', function ( snap ) {
            populateSalesTable( snap );
        });

        childRemoved( 'sales', function ( oldsnap ) {
            let id  =   oldsnap.key;
            $( '#sales-table' ).find( 'tr#'+id ).addClass( 'animated zoomOut' ).delay( 1000 ).empty( );
        });

        childChanged( 'sales', function ( snap ) {
            let id  =   snap.key;
            $( '#sales-table' ).find( 'tr#'+id ).find( 'td.status' ).text( snap.val( ).status );
        })
    }   else if ( target === '' && ( allowed.indexOf( $.session.get( 'type' ) ) ) !== 'undefined' ) {
        loadDataFromFirebase( 'categories', '', snap => {
            // Check if meals were found
            if ( snap.val( ) === null ) {

                // No meals found
                $( '#todays-sales tbody' )
                .empty( )
                .append(
                    `<tr>
                        <td colspan="3">
                            <h6 class="center">No Meals found!</h6>
                        </td>
                    </tr>`
                );
            } else {
                let d = new Date( );
                let today = Date.parse( d.toDateString( ) );
                let tomorrow = today + 86400000;

                loadDataFromFirebase( 'sales', '', snap => {
                    let orderCount   =   0;
                    let orderCash    =   0;
                    let takeAwayCount   =   0;
                    let takeAwayCash    =   0;
                    let takeInCount   =   0;
                    let takeInCash    =   0;
                    let deliveryCount   =   0;
                    let deliveryCash    =   0;

                    snap.forEach( child => {
                        if ( child.val( ).index >= today && child.val( ).index <= tomorrow ) {
                            if ( allowed.indexOf( $.session.get( 'type' ) ) < 0 ) {
                                if ( child.val( ).person === $.session.get( 'username' ) ) {

                                    orderCount++;
                                    orderCash += parseFloat( child.val( ).cost );

                                    if ( child.val( ).type === 'Take In' ) {
                                        takeInCount++;
                                        takeInCash += parseFloat( child.val( ).cost );
                                    }
                                    if ( child.val( ).type === 'Take Away' ) {
                                        takeAwayCount++;
                                        takeAwayCash += parseFloat( child.val( ).cost );
                                    }
                                    if ( child.val( ).type === 'Delivery' ) {
                                        deliveryCount++;
                                        deliveryCash += parseFloat( child.val( ).cost );
                                    }
                                }

                            }   else {
                                orderCount++;
                                orderCash += parseFloat( child.val( ).cost );

                                if ( child.val( ).type === 'Take In' ) {
                                    takeInCount++;
                                    takeInCash += parseFloat( child.val( ).cost );
                                }
                                if ( child.val( ).type === 'Take Away' ) {
                                    takeAwayCount++;
                                    takeAwayCash += parseFloat( child.val( ).cost );
                                }
                                if ( child.val( ).type === 'Delivery' ) {
                                    deliveryCount++;
                                    deliveryCash += parseFloat( child.val( ).cost );
                                }
                            }
                        }
                    });

                    $( '#order-count' ).text( orderCount );
                    $( '#order-cash' ).text( 'GHC ' + orderCash.toFixed( 2 ) );

                    // For take ins
                    $( '#take-in-count' ).text( takeInCount );
                    $( '#take-in-cash' ).text( 'GHC ' + takeInCash.toFixed( 2 ) );

                    // For take aways
                    $( '#take-away-count' ).text( takeAwayCount );
                    $( '#take-away-cash' ).text( 'GHC ' + takeAwayCash.toFixed( 2 ) );

                    // For Deliveries
                    $( '#delivery-count' ).text( deliveryCount );
                    $( '#delivery-cash' ).text( 'GHC ' + deliveryCash.toFixed( 2 ) );
                });

                // Meals found
                let row = '';
                $( '#todays-sales tbody' ).empty( );
                snap.forEach( child => {
                    var available = ( child.val( ).isAvailable ) ? 'Yes' : 'No';
                    if ( child.val( ).assigned_to === 'Meals' ) {
                        row = `<tr data-record-id="`+child.key+`" data-field="`+child.val( ).isAvailable+`">
                            <td>` + child.val( ).name +`</td>
                            <td>` + available + `</td>
                            <td>
                                <a class="btn amber darken-4 white-text isAvailable" data-meal-name="`+child.val( ).name+`">
                                    change
                                </a>
                            </td>
                        </tr>`;
                        $( '#todays-sales tbody' ).append( row );
                    }
                });
            }
        });
    }   else if ( target === 'users.html' && allowed.indexOf( $.session.get( 'type' ) ) >= 0 ) {
        // Fetch all users from database
        loadDataFromFirebase( 'users', '', snap => {
            let row = '';
            if ( snap !== null ) {
                console.log( snap.val( ));
                snap.forEach( child => {
                    let status = ( child.val( ).enabled ) ? 'Active' : 'Suspended';
                    row += `<tr>
                        <td>`+child.val( ).username+`</td>
                        <td>`+child.val( ).firstName+` `+child.val( ).lastName+`</td>
                        <td>`+child.val( ).gender+`</td>
                        <td>`+child.val( ).type+`</td>
                        <td>`+status+`</td>
                        <td>`+child.val( ).addedOn+`</td>
                        <td>
                            <a href="" class="col s4 btn-flat blue white-text center description" data-record-id="`+ child.key +`" data-ref="users">
                            <i class="material-icons">mode_edit</i>
                        </a>
                        <a href="" class="col s4 btn-flat amber white-text center change_status" data-record-id="`+ child.key +`" data-ref="users">
                            <i class="material-icons">style</i>
                        </a>
                        <a href="" class="col s4 btn-flat red white-text center del" data-record-id="`+ child.key +`" data-chain=true data-ref="users">
                            <i class="material-icons">delete</i>
                        </a>
                    </td>
                    </tr>`;
                });
                $( '#user-table tbody' ).html( row );
            }   else {
                $( '#user-table tbody' ).html( `<tr>
                    <td colspan="7"><h6 class="center">No Users found!</h6></td>
                </tr>` );
            }
        });
    }

    // End Loading Page Contents Using URL


    // Loading page contents using click events
    $( document ).on( 'click', '.page-loader', function( e ) {
        loadHTML( $( this ).attr( 'data-page-load' ) );

        // let onSuccess   =   populateCategoryTable( snap );
        if ( $( this ).attr( 'data-page-load' ) === 'category' ) {

            loadDataFromFirebase( 'categories', '', snap => {
                populateCategoryTable( snap );
            });

        } else if ( $( this ).attr( 'data-page-load' ) === 'adddrink' ) {

            filterDataFromFirebase( 'categories', 'assigned_to', 'Drinks', snap => {
                let categories = '<option value="">Select category</option>';

                snap.forEach( child => {
                    categories += `<option value="`+ child.val( ).name+`">`+ child.val( ).name+`</option>`;
                });

                $( '#drink_category' ).empty( ).append( categories ).material_select( );
            });

            loadDataFromFirebase( 'drinks', '', snap => {
                populateDrinksTable( snap );
            });

        } else if ( $( this ).attr( 'data-page-load' ) === 'addmeal' ) {

            filterDataFromFirebase( 'categories', 'assigned_to', 'Meals', snap => {
                let categories = '<option value="">Select category</option>';

                snap.forEach( child => {
                    categories += `<option value="`+ child.val( ).name+`">`+ child.val( ).name +`</option>`;
                });

                $( '#meal_category' ).empty( ).append( categories ).material_select( );
            });

            loadDataFromFirebase( 'meals', '', snap => {
                populateMealsTable( snap );
            });

        } else if ( $( this ).attr( 'data-page-load' ) === 'addsales' ) {

            childAdded( 'sales', function ( snap ) {
                populateSalesTable( snap );
            });

            childRemoved( 'sales', function ( oldsnap ) {
                let id  =   oldsnap.key;
                $( '#sales-table' ).find( 'tr#'+id ).addClass( 'animated zoomOut' ).delay( 1000 ).empty( );
            });

            childChanged( 'sales', function ( snap ) {
                let id  =   snap.key;
                $( '#sales-table' ).find( 'tr#'+id ).find( 'td.status' ).text( snap.val( ).status );
            })
        }

    })
    // End Loading page contents using click events

    // Filter categories by assigned_to
    $( document ).on( 'change', '#filter_category', function () {
        let filter = $( this ).val( ).trim( );
        if ( filter !== 'all' ) {
            filterDataFromFirebase( 'categories', 'assigned_to', filter, snap => {
                populateCategoryTable( snap );
            });
        } else {
            loadDataFromFirebase( 'categories', '', snap => {
                populateCategoryTable( snap );
            });
        }
    })
    //
})
