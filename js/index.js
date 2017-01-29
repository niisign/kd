$( document ).ready( () => {
    let allowed = [ 'admin', 'superadmin' ];

    $( '#receipt' ).hide( );
    $('.datepicker').pickadate({
        selectMonths: true, // Creates a dropdown to control month
        selectYears: 15 // Creates a dropdown of 15 years to control year
    });

    let navigate = {};
    let indeterministic = `<div class="progress">
        <div class="indeterminate"></div>
    </div>`;

    let old_content = '';
    const database = firebase.database( );
    $('select').material_select();
    $('.modal').modal();

    $( document ).on( 'click', '.btn', e => e.preventDefault( ) );

    // Add Category
    $( document ).on( 'click', '#add_category', function( ) {

        if ( ( allowed.indexOf( $.session.get( 'type' ) ) ) !== -1 ) {

            let category            =   {};
            category.name           =   upCaseEach( $( '#category_name' ).val( ) );
            category.assigned_to    =   $( '#assigned_to' ).val( );
            category.addedOn        =   get( 'date' );
            category.addedAt        =   get( 'time' );
            category.addedBy        =   $.session.get( 'firstName' );
            category.isAvailable    =   true;
            pushToFirebase( 'categories', $( '#category_name' ).val( ).trim( ).toLowerCase( ).replace( ' ', '-' ), category, function () {
                display( category.name + ' saved successfully!' );
            });
        } else {
            disallowed( );
        }
    });
    //

    // Delete Category
    $( document ).on( 'click', '.del', function ( e ) {
        e.preventDefault( );
        if ( ( allowed.indexOf( $.session.get( 'type' ) ) ) !== -1 ) {

            let that = $( this );
            let target  =   $( this ).attr( 'data-record-id' ).trim( );
            let ref = $( this ).attr( 'data-ref' ).trim( );
            let removed  =   false;

            let del = confirm( 'This will permanently remove this record!' );
            if ( del ) {
                if ( that.attr( 'data-chain' ) == 'true' ) {
                    // if the record is chained to other records; Delete the record
                    deleteFromFirebase( ref, target, function () {
                        // if the record is in sales, then upon deletion delete the chain in sold
                        if ( ref === 'sales' ) {
                            deleteFromFirebase( 'sold', target, function () {
                                display( 'Sales deletion succeeded!' );
                            });
                        }
                    });
                }   else {

                    deleteFromFirebase( ref, target, function () {
                        display( 'Record deletion succeeded!' );
                    });
                }
            }

        } else {
            disallowed( );
        }
    });
    //

    // Add Drinks
    $( document ).on( 'click', '#add_drink', () => {

        if ( ( allowed.indexOf( $.session.get( 'type' ) ) ) !== -1 ) {

            let drink = item(
                $( '#drink_name' ).val( ),
                $( '#drink_category' ).val( ),
                $( '#drink_price' ).val( ),
                $( '#drink_type' ).val( ),
                $( '#drink_quantity' ).val( ),
                ''
            );

            pushToFirebase( 'drinks', Date.now( ), drink, () => {
                display( drink.name + ' saved successfully!' );
            });

        } else {
            disallowed( );
        }
    })
    //

    // Add Meals
    $( document ).on( 'click', '#add-meal', function () {

        if ( ( allowed.indexOf( $.session.get( 'type' ) ) ) !== -1 ) {
            let valid = true;
            $( this ).closest( 'div' ).siblings( 'div' ).children( '.validate' ).each( function ( item ) {
                if ( $( this ).val( ).trim( ) === '' ) {
                    $( this ).closest( 'div' ).addClass( 'animated shake red lighten-4' );
                    valid = false
                }
            });

            if ( valid ) {
                $( this ).closest( 'div' ).addClass( 'animated shake red lighten-4' );
                let meal = {};
                meal.category   =   $( '#meal_category' ).val( );
                meal.name       =   upCaseEach( $( '#meal_name' ).val( ) );
                meal.type       =   $( '#flavor' ).val( );
                meal.price      =   parseFloat( $( '#meal_price' ).val( ) ).toFixed( 2 );
                meal.quantity   =   'Yes';
                meal.addedOn    =   get( 'date' );
                meal.addedAt    =   get( 'time' );
                meal.addedBy    =   'admin';
                meal.lastupdated    =   '';

                pushToFirebase( 'meals', Date.now( ), meal, () => display( meal.name + ' saved successfully!' ) );
            }
        } else {
            disallowed( );
        }
    })

    // Editable tables
    $( document ).on( 'dblclick', '.editable tbody td.edit', function () {
        if ( ( allowed.indexOf( $.session.get( 'type' ) ) ) !== -1 ) {
            let text = $( this ).text( );
            let $this = $( this );
            $( this ).html( `<input value="`+text+`" data-hidden="`+text+`" type="text" class="validate center editing">`).find( 'input').focus( );
        }
        });

    $( document ).on( 'keyup', '.editing', function( e ) {
        let that = $( this );
        if ( e.which == 27 ) {

            let text = $( this ).attr( 'data-hidden' );
            $( this ).closest( 'td' ).text( text );

        } else if ( e.which == 13 ) {

            let text = $( this ).val( );
            let tr = $( this ).closest( 'tr' );

            updateSpecificChildValue( tr.attr( 'data-ref' ), tr.attr( 'data-key' ), $( this ).closest( 'td' ).attr( 'data-name' ), text, that.closest( 'td' ).html( text ) );

            updateSpecificChildValue( tr.attr( 'data-ref' ), tr.attr( 'data-key' ), 'lastupdated', get( 'date' ), display( 'Update succeeded!' ) );
        }
    });
        //

    // Get items to sell
    $( document ).on( 'click', '.sellers', function ( e ) {

        let oldhtml = $( this ).find( '.loader' ).html( );
        $( this ).find( '.loader' ).html( loader );

        let that = $( this );
        e.preventDefault( );
        filterDataFromFirebase( 'categories', 'assigned_to', $( this ).attr( 'data-sell' ), snap => {
            navigate.ref    =   'categories';
            navigate.oldref    =   'categories';
            navigate.order  =   'assigned_to';
            navigate.value  =   that.attr( 'data-sell' );
            navigate.oldassigned_to = that.attr( 'data-sell' );
            navigate.oldvalue = that.attr( 'data-sell' );
            if ( snap.val( ) === null ) {
                that.find('.loader' ).html( oldhtml );
                that.find( 'span.loading' ).text( 'No categories found!' );
            } else {

                var categories = '';
                let names = [];
                snap.forEach( child => {
                    // Check if the meal is available
                    if ( child.val( ).isAvailable ) {
                        // If the meal is available then add the name to the names array
                        names.push( child.val( ).name );
                    }
                });

                // Check the number of names that have been added to the names array
                if ( names.length === 0 ) {
                    // If there are no names in the names array
                    $( '#selection' ).html(
                        `<h5>
                            Sorry, no meals available!
                        </h5>`
                    );
                }   else {
                    // Loop through the names found
                    names.map( ( name, index ) => {
                        setTimeout( ()=>{
                            filterDataFromFirebase( $( this ).attr( 'data-sell' ).toLowerCase( ), 'category', name, snap => {
                                categories = `<a href="" data-ref="`+$( this ).attr( 'data-sell' ).toLowerCase( )+`" data-value="`+ name +`" data-order="category" class="black-text get-items">
                                    <div class="col s12 m3 animated zoomIn">
                                        <div class="loader card-panel row center `+ colorShade( ) +`">
                                            <span class="item-name">`+ name +`</span><br>
                                            <span class="item-count">`+ snap.numChildren( ) +` </span>
                                            <span class="item-unit">items</span>
                                        </div>
                                    </div>
                                </a>`;

                                    if ( index === 0 ) {
                                        $( '#selection' ).removeClass( 'animated fadeOutUp' );
                                        $( '#selection' ).html( categories );
                                    }   else {
                                        $( '#selection' ).append( categories );
                                    }
                                });
                            }, 1000 );
                        })
                    }

                }
            })
        })
        //

        $( document ).on( 'click', '.get-items', function ( e ) {
            e.preventDefault( );
            let target = $( this );
            target.find( '.loader' ).html( loader );
            let items = '';
            navigate.ref    =   target.attr( 'data-ref' );
            navigate.order  =   target.attr( 'data-order' );
            navigate.value  =   target.attr( 'data-value');
            navigate.assigned_to = target.attr( 'data-value');

            loadDataFromFirebase( navigate.ref, '', snapshot => {

            $( '#selection' ).empty( );
            snapshot.forEach( snap => {
                if ( snap.val( ).category === navigate.value ) {
                    let color_shade = colorShade( );
                    let text = 'black-text';
                    let flavor = '';
                    if ( color_shade.split( ' ' )[ 1 ] === 'darken-4' || color_shade.split( ' ' )[ 1 ] === 'darken-3' ) {
                        text = "white-text";
                    }
                    let name = snap.val( ).name;

                    if ( snap.val( ).type.toLowerCase( ) === 'drinks' ) {
                        navigate.ref = 'categories';
                        flavor = '';
                    } else {
                        flavor = `<span class="items-flavor">`+ snap.val( ).type +`</span><br>`;
                        }

                        // let flavor = `<span class="items-flavor">`+ name +`</span><br>`;
                        let item = `<a href="" class="black-text items"><div class="col s12 m4 animated zoomIn">
                            <div class="card-panel row center items-card `+ color_shade +` `+ text +`">
                                <span class="items-name">`+ name +`</span><br>`+flavor+`
                                    <span>GHC </span><span class="item-cost">`+snap.val( ).price +`</span><br>
                                        <span class="item-count">`+ snap.val( ).quantity +`</span><span class="item-unit"> items</span>
                                        <span class="item-qty"></span>
                                        <input type="hidden" value="`+snap.key+`" class="item-id" >
                                            <input type="hidden" value="`+snap.val( ).category+`" class="item-category" >
                                            </div>
                                        </div></a>`;

                                        // navigate.ref = snap.val( ).type.toLowerCase( );
                        $( '#selection' ).append( item );
                    }
                })
            })
        });

        $( document ).on( 'click', '.items', function ( e ) {

            e.preventDefault( );
            $( this ).find( 'div.animated' ).removeClass( 'zoomIn' ).addClass( 'bounce' );
            let count = $( this ).find( 'span.item-count' ).text( );
            $( this ).find( 'span.item-qty' ).html( '<input type="number" class="center" holder="'+count+'">' );
                $( this ).find( 'span.item-qty input' ).focus( );

                setTimeout( function(){
                    $( '.items' ).find( 'div.animated' ).removeClass( 'bounce' );
                }, 1000 );

            });

        $( document ).on( 'keyup', 'span.item-qty input', function ( e ) {
            if ( e.which == 13 ) {
                let name    = $( this ).closest( 'span' ).siblings( 'span.items-name' ).text( ) +' '+ $( this ).closest( 'span' ).siblings( 'span.items-flavor' ).text( );
                let cost    = $( this ).closest( 'span' ).siblings( 'span.item-cost' ).text( );
                let id      = $( this ).closest( 'span' ).siblings( 'input.item-id' ).val( );
                let category= $( this ).closest( 'span' ).siblings( 'input.item-category' ).val( );
                let qty     = $( this ).val( );

                if ( ( parseInt( qty ) > parseInt( $( this ).attr( 'holder' ) ) )  && navigate.oldvalue == 'Drinks' ) {
                    $( this ).closest( 'span' ).parent( 'div' ).closest( 'div.animated' ).addClass( 'shake' );

                    let that = $( this ).closest( 'span' );

                    setTimeout( function(){
                        $( '.items' ).find( 'div.animated' ).removeClass( 'shake' );
                        that.empty( );
                    }, 1000 );

                    $( this ).val('');
                }   else {
                    let new_item = `
                    <tr class="sold-items" data-record-id="`+id+`" data-category="`+category+`">
                        <td class="sold-name">`+ name +`</td>
                        <td class="sold-cost">`+ cost +`</td>
                        <td class="item-qty">`+ qty +`</td>
                        <td class="item-prices">`+ parseFloat( parseFloat( cost ) * parseInt( qty ) )+`</td>
                    </tr>`;
                    $( '#summary tbody' ).append( new_item );
                    $( this ).closest( 'span' ).empty( );
                    let index = 1;
                    let item_price = 0.0;
                    $( '.items' ).each( function ( item ){
                        let intv = 100;

                        setTimeout( () => {
                            $( '#nav-icon' ).click( );
                            $( this ).find( 'div.animated' ).addClass( 'zoomOut' );
                        },  intv );
                        intv += 500;
                    })

                    $( '.item-prices' ).each( function( price ){
                        item_price  += parseFloat( $( this ).text( ) );
                    });

                    $( '#total-cost' ).text( item_price.toFixed( 2 ) );
                    display( name + ' added successfully!' );
                }

            } else if ( e.which == 27 ) {
                $( this ).closest( 'span' ).empty( );
            }
        })

// Navigate to categories
$( document ).on( 'click', '#nav-icon', function ( e ) {
    let items = '';
    e.preventDefault( );

    // Load Categories
    loadDataFromFirebase( navigate.oldref, '', snap => {
        let names = [];

        snap.forEach( child => {
            if ( child.val( ).isAvailable ) {
                if ( child.val( ).assigned_to === navigate.oldassigned_to ) {
                    names.push( child.val( ).name );
                }
            }
        })
        //

        // Load Items under categories
        loadDataFromFirebase( navigate.oldvalue.toLowerCase( ), '', snap => {
            let items = [];
            let index = 0;
            let group = '';

            names.map( name => {
                let count = 0;
                //
                snap.forEach( child => {
                    if ( child.val( ).category === name ) {
                        child.val( ).index = index;
                        count++;
                        items.push( child.val( ));
                    }
                })
                let color_shade = colorShade( );
                let text = 'black-text';
                if ( color_shade.split( ' ' )[ 1 ] === 'darken-4' || color_shade.split( ' ' )[ 1 ] === 'darken-3' ) {
                    text = "white-text";
                }
                group += `<a href="" data-ref="`+navigate.oldvalue.toLowerCase( )+`" data-value="`+ name +`" data-order="category" class="`+ text +` get-items">
                    <div class="col s12 m3 animated zoomIn">
                        <div class="card-panel row center `+ color_shade +`">
                            <span class="item-name">`+ name +`</span><br>
                                <span class="item-count">`+ count +`</span><span class="item-unit"> items</span>
                            </div>
                        </div></a>`;
                    })

                    $( '#selection' ).html( group );
                })
                //
            })
        })

        // Calculate Change
        $( document ).on( 'keyup', '#amount-paid', function () {
            if ( parseFloat( $( this ).val( ) ) != 'NaN' ) {
                if ( parseFloat( $( this ).val( ) ) >= parseFloat( $( '#total-cost' ).text( ) ) ) {
                    let change = parseFloat( $( this ).val( ) ) - parseFloat( $( '#total-cost' ).text( ) );
                    $( '#change-due' ).text( change.toFixed( 2 ) );
                } else if ( $( this ).val( ).trim( ) === '' ) {
                    $( '#change-due' ).text( 0.00.toFixed( 2 ) );
                }
            }
        });
        //

        // Cancel Sale
        $( document ).on( 'click', '#cancel-sale', function ( e ) {
            $( '#summary tbody' ).empty( );
            $( '#change-due' ).text( 0.00.toFixed( 2 ) );
            $( '#total-cost' ).text( 0.00.toFixed( 2 ) );
            $( '#amount-paid' ).val( '' );
            $( '#prev-type' ).val( '' );
            $( '#sales-type' ).material_select( );
        })
        //

        // Delivery Fee
        $( document ).on( 'change', '#sales-type', function () {
            $( '#amount-paid' ).val( '' );
            let prevType = $( '#prev-type' ).val( );
            if (
                $( this ).val( ) === 'Delivery' &&
                prevType !== 'Delivery' ) {

                    let cost = parseFloat( $( '#total-cost' ).text( ) ) + 0.50;
                    $( '#total-cost' ).text( cost.toFixed( 2 ) );

                } else if( prevType === 'Delivery' && ( $( this ).val( ) === 'Take In' || $( this ).val( ) === 'Take Away' ) ){
                    let cost = parseFloat( $( '#total-cost' ).text( ) ) - 0.50;
                    $( '#total-cost' ).text( cost.toFixed( 2 ) );
                }

                $( '#prev-type' ).val( $( this ).val( ) );
            })
            //

        // Save Sales
        $( document ).on( 'click', '#save-sale', function ( e ) {

            let closest_div = $( this ).closest( 'div' );
            if (
                $( '#amount-paid' ).val( ).trim( ) === '' ||
                parseFloat( $( '#amount-paid' ).val( ) ) === NaN ||
                parseFloat( $( '#amount-paid' ).val( ).trim( ) ) < parseFloat( $( '#total-cost' ).text( ) ).toFixed( 2 ) ) {
                    $( '#amount-paid' ).closest( 'div' ).addClass( 'animated shake' );

                    setTimeout( () => {
                        $( '#amount-paid' ).closest( 'div' ).removeClass( 'animated shake' );
                    }, 300 );
                } else {
                    var receipt = '';
                    let old = closest_div.html( );
                    closest_div.html( indeterministic );
                    let item_qty = 0;
                    let sales = {};

                    $( '.item-qty' ).each( function ( qty ) {
                        item_qty += parseInt( $( this ).text( ) );
                    });

                    let id          = Date.now( );
                    sales.items     = item_qty;
                    sales.cost      = parseFloat( $( '#total-cost' ).text( ) ).toFixed( 2 );
                    sales.person    = $.session.get( 'username' );
                    sales.paid      = parseFloat( $( '#amount-paid' ).val( ).trim( ) ).toFixed( 2 );
                    sales.change    = parseFloat( $( '#change-due' ).text( ) ).toFixed( 2 );
                    sales.status    = 'Pending';
                    sales.locator   = $( '#locator' ).val( );
                    sales.type      = $( '#sales-type' ).val( );
                    sales.soldOn    = get( 'date' );
                    sales.soldAt    = get( 'time' );
                    sales.index     = id;
                    sales.delivery  = ( $( '#prev-type' ).val( ) === 'Delivery' ) ? 0.50 : 0.00;

                    let invoice     = prepareReceipt( id, sales.locator, sales.type, $.session.get( 'firstName' ), ( ( sales.cost - sales.delivery ).toFixed( 2 ) ), sales.delivery, sales.cost, sales.paid, sales.change );

                    pushToFirebase( 'sales', id, sales, function() {
                        let sold = {};
                        let number = 1;
                        $( '.sold-items' ).each( function ( sold_item ) {
                            let stock_id    = $( this ).attr( 'data-record-id' );
                            let ref         = $( this ).attr( 'data-category' );
                            sold.name       = $( this ).children( 'td.sold-name' ).text( );
                            sold.quantity   = parseInt( $( this ).children( 'td.item-qty' ).text( ) );

                            sold.price      = parseInt( $( this ).children( 'td.item-qty' ).text( ) ) * parseFloat( $( this ).children( 'td.sold-cost' ).text( ) );

                            // Save Sales
                            pushToFirebase( 'sold', id +'/item-'+ number, sold, function() {
                                // Prepare rows for receipt generation

                                // Select the item sold from the database
                                loadDataFromFirebase( navigate.oldvalue.toLowerCase( ), stock_id, snap => {
                                    if ( snap.val( ).type === 'Drinks' ) {
                                        let qty = parseInt( snap.val( ).quantity ) - parseInt( sold.quantity );

                                        // Update the quantity of the item sold
                                        updateSpecificChildValue( navigate.oldvalue.toLowerCase( ), stock_id, 'quantity', qty, function() {
                                            closest_div.empty( ).html( old );
                                            $( '#summary tbody' ).empty( );
                                            $( '#change-due' ).text( 0.00.toFixed( 2 ) );
                                            $( '#total-cost' ).text( 0.00.toFixed( 2 ) );
                                            $( '#amount-paid' ).val( '' );
                                            $( '#locator' ).val( '' );
                                            $( '#sales-type' ).val( 'Take In' );
                                            $( '#sales-type' ).material_select( );
                                            $( '#prev-type' ).val( '' );
                                        });
                                    } else {
                                        closest_div.empty( ).html( old );
                                        $( '#summary tbody' ).empty( );
                                        $( '#change-due' ).text( 0.00.toFixed( 2 ) );
                                        $( '#total-cost' ).text( 0.00.toFixed( 2 ) );
                                        $( '#amount-paid' ).val( '' );
                                        $( '#locator' ).val( '' );
                                        $( '#sales-type' ).material_select( );
                                        $( '#sales-type' ).val( 'Take In' );
                                        $( '#prev-type' ).val( '' );
                                    }
                                });
                            });
                            receipt = {
                                columns:[
                                    {
                                        width:'60%',
                                        margin:[ 20, 0 ],
                                        text:[
                                            { text:sold.name, fontSize: 8 }
                                        ]
                                    },
                                    {
                                        width:'10%',
                                        margin:[ 20, 0 ],
                                        text:[
                                            { text:sold.quantity, fontSize: 8, alignment: 'right' }
                                        ]
                                    },
                                    {
                                        width:'30%',
                                        margin:[ 20, 0 ],
                                        text:[
                                            { text:sold.price.toFixed( 2 ), fontSize: 8, alignment: 'right' }
                                        ]
                                    }
                                ]
                            };
                            invoice.content.splice( 13, 0, receipt );
                            number++;
                        });
                        // display( 'Sales saved successfully!' );

                        printReceipt( invoice );
                    });


                }
            })
            //

        $( document ).on( 'click', '.description', function ( e ) {
            e.preventDefault( );
            old_content = $( '.switch' ).html( );
            let table = `<table class="responsive-table">
                <thead>
                    <th>Number</th>
                    <th>Name</th>
                    <th>Quantity</th>
                    <th>Price</th>
                </thead>
                <tbody>`;
                    let id = $( this ).attr( 'data-record-id' );
                    let details = '';
                    loadDataFromFirebase( 'sold', id, snap => {
                        snap.forEach( function ( child ) {
                            details += `
                            <tr>
                                <td>`+child.key+`</td>
                                <td>`+child.val( ).name+`</td>
                                <td>`+child.val( ).quantity+`</td>
                                <td>`+parseFloat( child.val( ).price).toFixed( 2 )+`</td>
                            </tr>`;
                        })
                        table += details;
                        table += `</tbody></table><br><button id="done" class="btn green">Done</button><br>`;
                            $( '#sales-header' ).text( 'Sales Details' );
                            $( '.switch' ).html( table );
                        })
                    })

        $( document ).on( 'click', '#done', function () {
            $( '.switch' ).html( old_content );
            $( '#sales-header' ).text( 'Today\'s Sales' );
        })

        // CHANGE STATUS OF SALES
        $( document ).on( 'click', '.change_status', function ( e ) {
            e.preventDefault( );
            let id = $( this ).attr( 'data-record-id' );
            updateSpecificChildValue( 'sales', id, 'status', 'Served', function () {
                display( 'Order status changed!' );
            })
        })
        //

    // GET ALL SALES
    $( document ).on( 'click', '#get-sales', function ( e ) {
        let that = $( this );
        let valid = true;
        $( this ).closest( 'div' ).siblings( 'div' ).find( 'input.validate' ).each( function ( item ) {
            if ( $( this ).val( ).trim( ) === '' ) {
                valid =   false;
                $( this ).parent( 'div' ).addClass( 'animated shake' );
                let initThis = $( this );
                setTimeout( function () {
                    initThis.parent( 'div' ).removeClass( 'animated shake' );
                    $('.datepicker').pickadate({
                        selectMonths: true, // Creates a dropdown to control month
                        selectYears: 3 // Creates a dropdown of 15 years to control year
                    });

                }, 500 );
            }
        })

        if ( valid ) {
            let startDate   =   Date.parse( $( '#start-date' ).val( ).trim( ) );
            let endDate     =   Date.parse( $( '#end-date' ).val( ).trim( ) );

            if ( endDate < startDate ) {
                display( 'Choose an earlier date for end date' );
            }   else {
                if ( endDate === startDate ) {
                    endDate = new Date( );
                    endDate = endDate.setDate( endDate.getDate( ) + 1 );
                }
                display( 'Working...' );
                let ref = firebase.database( ).ref( 'sales' );
                ref.orderByChild( 'index' ).on( 'value', function ( snap ) {
                    $( '#all-sales tbody' ).empty( );
                    let children = 0;
                    let deliveryOrders = 0;
                    let takeInOrders = 0;
                    let takeAwayOrders = 0;

                    let cash = 0.00;
                    let deliveryCash = 0.00;
                    let takeInCash = 0.00;
                    let takeAwayCash = 0.00;
                    snap.forEach( function ( child ) {
                        if ( child.val( ).index >= startDate && child.val( ).index <= endDate ) {
                            if ( child.val( ).type === 'Delivery' ) {
                                deliveryOrders++;
                                deliveryCash += parseFloat( child.val( ).cost );
                            }
                            if ( child.val( ).type === 'Take In' ) {
                                takeInOrders++;
                                takeInCash += parseFloat( child.val( ).cost );
                            }
                            if ( child.val( ).type === 'Take Away' ) {
                                takeAwayOrders++;
                                takeAwayCash += parseFloat( child.val( ).cost );
                            }
                            children++
                            cash += parseFloat( child.val( ).cost );

                            $( '#all-sales tbody' ).append( `<tr>
                                <td>`+ child.val( ).person + `</td>
                                <td>`+ child.val( ).type + `</td>
                                <td>`+ child.val( ).locator+ `</td>
                                <td>`+ child.val( ).items+ `</td>
                                <td>`+ child.val( ).cost +`</td>
                                <td>`+ child.val( ).paid +`</td>
                                <td>`+ child.val( ).change +`</td>
                                <td>`+ child.val( ).status +`</td>
                                <td><a href="" class="center description" data-record-id="`+ child.key +`" data-ref="sales">
                                    <i class="blue-text material-icons">description</i>
                                </a>
                                <a href="" class="center change_status" data-record-id="`+ child.key +`" data-ref="sales">
                                    <i class="amber-text material-icons">style</i>
                                </a>
                                <a href="" class="center del" data-record-id="`+ child.key +`" data-chain=true data-ref="sales">
                                    <i class="red-text material-icons">delete</i>
                                </a></td>
                            </tr>` );

                        }
                    })
                    $( 'td#total-orders' ).text( children );
                    $( 'td#total-cash' ).text( 'GHC ' + cash.toFixed( 2 ) );
                    $( 'td#delivery-orders' ).text( deliveryOrders );
                    $( 'td#delivery-cash' ).text( 'GHC ' + deliveryCash.toFixed( 2 ) );
                    $( 'td#take-in-orders' ).text( takeInOrders );
                    $( 'td#take-in-cash' ).text( 'GHC ' + takeInCash.toFixed( 2 ) );
                    $( 'td#take-away-orders' ).text( takeAwayOrders );
                    $( 'td#take-away-cash' ).text( 'GHC ' + takeAwayCash.toFixed( 2 ) );
                })
            }
        }
    })
    //

    $( document ).on( 'click', '#user-login', function ( e ) {
        display( 'Working...' );
        signIn( $( '#username' ).val( ).trim( ), $( '#password' ).val( ).trim( ) );
    });

    $( document ).on( 'click', '#sign-out', function ( e ) {
        e.preventDefault( );
        display( 'Logging out...' );
        signOut( );
    });

    $( document ).on( 'click', '.available', function ( e ) {
        e.preventDefault( );
        alert( $( this ).attr( 'data-record-id' ) );
    });

    $( document ).on( 'click', '.isAvailable', function () {
        let that    = $( this );
        let id      = $( this ).closest( 'tr' ).attr( 'data-record-id' );
        let field   = $( this ).closest( 'tr' ).attr( 'data-field' );
        let value   = ( field == 'true' ) ? false : true;
        that.text( 'changing...' );

        updateSpecificChildValue( 'categories', id, 'isAvailable', value, () => {
            if ( value ) {
                that.checked = true;
                display( that.attr( 'data-meal-name' ) + ' is now available!' );
            }   else {
                that.checked = false;
                display( that.attr( 'data-meal-name' ) + ' is not available!' );
            }
            that.text( 'change' );

        });
    });

});
