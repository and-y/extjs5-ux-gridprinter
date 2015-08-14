/**
 * @class Ext.ux.grid.Printer
 * @author Ed Spencer (edward@domine.co.uk)
 * Helper class to easily print the contents of a grid. Will open a new window with a table where the first row
 * contains the headings from your column model, and with a row for each item in your grid's store. When formatted
 * with appropriate CSS it should look very similar to a default grid. If renderers are specified in your column
 * model, they will be used in creating the table. Override headerTpl and bodyTpl to change how the markup is generated
 *
 * Usage:
 *
 * 1 Add Ext.Require Before the Grid code
 *
 *     Ext.require([
 *        'Ext.ux.grid.GridPrinter',
 *     ]);
 *
 * 2 Declare the Grid
 *
 *     var grid = Ext.create('Ext.grid.Panel', {
 *         columns: //some column model,
 *         store   : //some store
 *     });
 *
 * 3 Print!
 *
 *     var printer = Ext.create('Ext.ux.grid.Printer', {
 *          mainTitle : 'Your Title here' //optional
 *     });
 *     printer.print(grid);
 *
 * Original url: http://edspencer.net/2009/07/printing-grids-with-ext-js.html
 *
 */
// Commented with double slash to keep documentation generated by jsduck clean
//
// Modified by Loiane Groner (me@loiane.com) - September 2011 - Ported to Ext JS 4
// http://loianegroner.com (English)
// http://loiane.com (Portuguese)
//
// Modified by Bruno Sales - August 2012
//
// Modified by Paulo Goncalves - March 2012
//
// Modified by Beto Lima - March 2012
//
// Modified by Beto Lima - April 2012
//
// Modified by Paulo Goncalves - May 2012
//
// Modified by Nielsen Teixeira - 2012-05-02
//
// Modified by Joshua Bradley - 2012-06-01
//
// Modified by Loiane Groner - 2012-09-08
//
// Modified by Loiane Groner - 2012-09-24
//
// Modified by Loiane Groner - 2012-10-17
// FelipeBR contribution: Fixed: support for column name that contains numbers
// Fixed: added support for template columns
//
// Modified by Loiane Groner - 2013-Feb-26
// Fixed: added support for row expander plugin
// Tested using Ext JS 4.1.2
//
// Modified by Steven Ervin - 2013-Sep-18
// Added support for summary and groupingsummary features
// Aligned columns according to grid column's alignment setting.
// Updated to use columnManager to recognize grid reconfiguration
// changes under 4.2.1.
//
// Modified by Steven Ervin - 2013-Oct-24
// Added support for using the MetaData object to style the output.
// Added support for Server generated summaries.
//
// Modified by Alexandr Arzamastsev - 2013-Nov-20
// Set printLinkText and closeLinkText as params
// Added param for page title.
Ext.define('Ext.ux.grid.Printer', {
    extend: 'Ext.Base',
    requires: [
        'Ext.XTemplate'
    ],
    mixins: [
        'Ext.mixin.Observable'
    ],
    config: {
        /**
         * The path at which the print stylesheet can be found (defaults to 'ux/grid/gridPrinterCss/print.css')
         * @cfg {String} stylesheetPath
         */
        stylesheetPath: null,
        /**
         * True to open the print dialog automatically and close the window after printing. False to simply open the print version
         * of the grid (defaults to false)
         * @cfg {Boolean} [printAutomatically=false]
         */
        printAutomatically: false,
        /**
         * True to close the window automatically after printing.
         * @cfg {Boolean} [closeAutomaticallyAfterPrint=false]
         */
        closeAutomaticallyAfterPrint: false,
        /**
         * Title to be used on top of the table
         * @cfg {String} [pageTitle='Print View']
         */
        pageTitle: 'Print View',
        /**
         * Title to be used on top of the table
         * @cfg {String} [mainTitle='']
         */
        mainTitle: '',
        /**
         * Text show on print link
         * @cfg {String} [printLinkText='Print']
         */
        printLinkText: 'Print',
        /**
         * Text show on close link
         * @cfg {String} [closeLinkText='Close']
         */
        closeLinkText: 'Close',
        /**
         * The markup used to create the headings row. By default this just uses <th> elements, override to provide your own
         * @cfg {Object/Array} headerTpl
         */
        headerTpl: [
            '<tpl for=".">',
            '<th style="text-align: {align}">{text}</th>',
            '</tpl>'
        ]
    },
    /**
     * Fires before actual print, return false to cancel the event.
     * @event beforePrint
     * @param {Ext.Template} htmlTemplate the template with assigned records
     */

    /**
     * Fires when the print dialog was shown either successful or not.
     * @event print
     * @param {Boolean} successful
     */

    /**
     * Fires only when the print was successful.
     * @event afterPrint
     */

    /**
     * Initialize config
     * @private
     * @return {undefined}
     */
    constructor: function(config) {
        var me = this;
        me.callParent(arguments);
        me.mixins.observable.constructor.call(me, config);
        me.initConfig();
    },
    /**
     * Prints the passed grid. Reflects on the grid's column model to build a
     * table, and fills it using the store
     * @param {Ext.grid.Panel} grid The grid to print
     */
    print: function(grid) {
        var me = this;
        var store = grid.getStore();
        // We generate an XTemplate here by using 2 intermediary
        // XTemplates - one to create the header, the other
        // to create the body (see the escaped {} below)
        var isGrouped = store.isGrouped();
        //build a usable array of store data for the XTemplate
        // use the column manager to get the columns.
        var columns = grid.columnManager.getColumns();
        var clearColumns = [];
        var data = [];
        var records = [];
        var groupField, feature, html;

        if (isGrouped) {
            feature = me.getFeature(grid, 'grouping');

            if (feature) {
                groupField = feature.getGroupField();
            }
            else {
                isGrouped = false; // isGrouped turned off if grouping feature not defined
            }
        }

        // remove columns that do not contain dataIndex or dataIndex is empty.
        // for example: columns filter or columns button
        Ext.each(
            columns,
            function(column) {
                if (!column) {
                    return;
                }

                if (!Ext.isEmpty(column.dataIndex) && !column.hidden && !isGrouped) {
                    clearColumns.push(column);
                }
                else if (column.xtype === 'rownumberer') {
                    if (!column.text) {
                        column.text = 'Row';
                    }
                    clearColumns.push(column);
                }
                else if (column.xtype === 'templatecolumn') {
                    clearColumns.push(column);
                }
                else if (isGrouped &&
                    column.dataIndex !== groupField &&
                    column.xtype !== 'actioncolumn') {
                    clearColumns.push(column);
                }
            }
        );
        columns = clearColumns;

        //get Styles file relative location, if not supplied
        if (me.getStylesheetPath() === null) {
            var scriptPath = Ext.Loader.getPath('Ext.ux.grid.Printer');
            me.setStylesheetPath(scriptPath.substring(0, scriptPath.indexOf('Printer.js')) + 'gridPrinterCss/print.css');
        }

        if (store instanceof Ext.data.TreeStore) {
            store.getRootNode().cascadeBy(function(node) {
                if (node.isRoot() && !grid.rootVisible) {
                    return;
                }

                if (!node.isVisible()) {
                    return;
                }
                records.push(node);
            }, me);
        }
        else if (store instanceof Ext.data.BufferedStore) {
            // when we got a buffered store we gather the data of the current page
            // displayed and print the grid in the callback of getRange.
            var pageSize = store.getPageSize();
            var start = (store.currentPage - 1) * pageSize;
            var end = start + pageSize;
            store.getRange(start, end, {
                callback: function(records) {
                    _printGrid(records);
                }
            });
            return;
        }
        else {
            records = store.getRange();
        }

        _printGrid(records);
        return;

        /**
         * Öffnet ein neues Tab mit dem Inhalt zum drucken.
         * @param {Ext.data.Model[]} records
         */
        function _printGrid(records) {
            var htmlMarkup = me.getHtmlMarkup(grid, columns, feature, isGrouped);
            html = Ext.create('Ext.XTemplate', htmlMarkup).apply(records);

            if (!me.fireEvent('beforePrint', html)) {
                return;
            }

            //open up a new printing window, write to it, print it and close
            var win = window.open('', 'printgrid');

            if (!win) {
                me.fireEvent('print', false);
                return;
            }

            //document must be open and closed
            try {
                win.document.open();
                win.document.write(html);
                win.document.close();

                if (me.getPrintAutomatically()) {
                    win.print();
                }

                //Another way to set the closing of the main
                if (me.getCloseAutomaticallyAfterPrint()) {
                    if (Ext.isIE) {
                        window.close();
                    }
                    else {
                        win.close();
                    }
                }
                me.fireEvent('print', true);
            }
            catch (e) {
                me.fireEvent('print', false);
                return;
            }

            me.fireEvent('afterPrint', true);
        }
    },
    /**
     * Retuns Html markup based of the grid data.
     * @param {Ext.grid.Panel} grid
     * @param {Ext.grid.column.Column[]} columns
     * @param {Boolean} isGrouped
     * @returns {String} the generated Html
     */
    getHtmlMarkup: function(grid, columns, isGrouped) {
        var me = this;
        var pluginsBodyMarkup = [];
        var groupFeature = (isGrouped) ? me.getFeature(grid, 'grouping') : false;
        var body = me.generateBody(grid, columns, groupFeature);
        //use the headerTpl and bodyTpl markups to create the main XTemplate below
        var headings = Ext.create('Ext.XTemplate', me.getHeaderTpl()).apply(columns);
        var title = grid.title || me.getPageTitle();
        var summaryFeature = me.getFeature(grid, 'summary');

        var expanderTemplate;

        //add relevant plugins
        Ext.each(grid.plugins, function(p) {
            if (p.ptype == 'rowexpander') {
                expanderTemplate = p.rowBodyTpl;
            }
        });

        if (expanderTemplate) {
            pluginsBodyMarkup = [
                '<tr class="{[xindex % 2 === 0 ? "even" : "odd"]}"><td colspan="' + columns.length + '">',
                '{[ this.applyTpl(values) ]}',
                '</td></tr>'
            ];
        }
        return [

            '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">',
            '<html class="' + Ext.baseCSSPrefix + 'ux-grid-printer">',
            '<head>',
            '<meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />',
            '<link href="' + me.getStylesheetPath() + '" rel="stylesheet" type="text/css" />',
            '<title>' + title + '</title>',
            '</head>',
            '<body class="' + Ext.baseCSSPrefix + 'ux-grid-printer-body">',
            '<div class="' + Ext.baseCSSPrefix + 'ux-grid-printer-noprint ' + Ext.baseCSSPrefix + 'ux-grid-printer-links">',
            '<a class="' + Ext.baseCSSPrefix + 'ux-grid-printer-linkprint" href="javascript:void(0);" onclick="window.print();">' + me.getPrintLinkText() + '</a>',
            '<a class="' + Ext.baseCSSPrefix + 'ux-grid-printer-linkclose" href="javascript:void(0);" onclick="window.close();">' + me.getCloseLinkText() + '</a>',
            '</div>',
            '<h1>' + me.getMainTitle() + '</h1>',
            '<table>',
            '<tr>',
            headings,
            '</tr>',
            '<tpl for=".">',
            '<tr class="{[xindex % 2 === 0 ? "even" : "odd"]}">',
            body,
            '</tr>',
            pluginsBodyMarkup.join(''),
            '{% if (this.isGrouped && xindex > 0) break; %}',
            '</tpl>',
            '<tpl if="this.hasSummary">',
            '<tr>',
            '<tpl for="this.columns">',
            '{[ this.renderSummary(values, xindex) ]}',
            '</tpl>',
            '</tr>',
            '</tpl>',
            '</table>',
            '</body>',
            '</html>', {
                isGrouped: isGrouped,
                grid: grid,
                columns: columns,
                hasSummary: Ext.isObject(summaryFeature),
                summaryFeature: summaryFeature,
                expanderTemplate: expanderTemplate,
                renderColumn: function(column, value, rcd, col) {
                    var me = this;
                    var meta = {
                        'align': column.align,
                        'cellIndex': col,
                        'classes': [],
                        'column': column,
                        'css': '',
                        'innerCls': '',
                        'record': rcd,
                        'recordIndex': grid.store.indexOf ? grid.store.indexOf(rcd) : undefined,
                        'style': '',
                        'tdAttr': '',
                        'tdCls': '',
                        'unselectableAttr': 'unselectable="on"',
                        'value': value
                    };
                    if (column.xtype == 'templatecolumn') {
                        value = column.tpl ? column.tpl.apply(rcd.data) : value;
                    }
                    else if (column.renderer) {
                        if (column instanceof Ext.tree.Column) {
                            value = column.renderer.call(column, value, meta, rcd, -1, col - 1, me.grid.store, me.grid.view);
                        }
                        else {
                            value = column.renderer.call(me.grid, value, meta, rcd, -1, col - 1, me.grid.store, me.grid.view);
                        }
                    }

                    return me.getHtml(value, meta);
                },
                applyTpl: function(rcd) {
                    var html = this.expanderTemplate.apply(rcd.data);
                    return html;
                },
                renderSummary: function(column, colIndex) {
                    var me = this;
                    var value;
                    if (me.summaryFeature.remoteRoot) {
                        var summaryRecord = me.summaryFeature.summaryRecord || (new me.grid.view.store.model(null, me.grid.view.id + '-summary-record'));
                        if (me.grid.view.store.proxy.reader.rawData) {
                            if (Ext.isArray(me.grid.view.store.proxy.reader.rawData[me.summaryFeature.remoteRoot])) {
                                summaryRecord.set(me.grid.view.store.proxy.reader.rawData[me.summaryFeature.remoteRoot][0]);
                            }
                            else {
                                summaryRecord.set(me.grid.view.store.proxy.reader.rawData[me.summaryFeature.remoteRoot]);
                            }
                        }
                        value = summaryRecord.get(column.dataIndex);
                    }
                    else {
                        value = me.getSummary(me.grid.store, column.summaryType, column.dataIndex, false);
                    }

                    if (column.summaryRenderer) {
                        var summaryRcd = me.getSummaryRecord42();
                        var summaryObject = me.getSummaryObject42(value, column, colIndex, summaryRcd);
                        value = column.summaryRenderer.call(me.grid,
                            value,
                            summaryObject,
                            summaryRcd, -1,
                            colIndex,
                            me.grid.store,
                            me.grid.view);

                        return me.getHtml(value, summaryObject);
                    }
                    else {
                        var meta = me.getSummaryObject42(column, colIndex);
                        if (!Ext.isDefined(value) || value == 0) {
                            return me.getHtml("&nbsp;", meta);
                        }
                        else {
                            return me.getHtml(value, meta);
                        }
                    }
                },
                getSummaryObject: function(align) {
                    var me = this;
                    var summaryValues = {};
                    for (var i = 0; i < columns.length; i++) {
                        var valueObject = me.getSummary(me.grid.store, me.columns[i].summaryType, me.columns[i].dataIndex, false);
                        if (Ext.isDefined(valueObject)) {
                            continue; // Do nothing
                        }
                        else {
                            summaryValues[columns[i].id] = valueObject;
                        }
                    }
                    summaryValues['style'] = "text-align:" + align + ';';
                    return summaryValues;
                },
                getSummaryRecord42: function() {
                    var me = this;
                    if (me.summaryFeature.remoteRoot) {
                        var summaryRecord = me.summaryFeature.summaryRecord || (new me.grid.view.store.model(null, me.grid.view.id + '-summary-record'));
                        if (me.grid.view.store.proxy.reader.rawData) {
                            if (Ext.isArray(me.grid.view.store.proxy.reader.rawData[me.summaryFeature.remoteRoot])) {
                                summaryRecord.set(me.grid.view.store.proxy.reader.rawData[me.summaryFeature.remoteRoot][0]);
                            }
                            else {
                                summaryRecord.set(me.grid.view.store.proxy.reader.rawData[me.summaryFeature.remoteRoot]);
                            }
                        }
                        return summaryRecord;
                    }

                    var rcd = Ext.create(me.grid.store.model);
                    for (var i = 0; i < me.columns.length; i++) {
                        var valueObject = me.getSummary(me.grid.store, me.columns[i].summaryType, me.columns[i].dataIndex, false);
                        if (!Ext.isDefined(valueObject)) {
                            continue; // Do nothing
                        }
                        else {
                            rcd.set(me.columns[i].dataIndex, valueObject);
                        }
                    }
                    return rcd;
                },
                getSummaryObject42: function(value, column, colIndex, rcd) {
                    return {
                        align: column.align,
                        cellIndex: colIndex,
                        'column': column,
                        classes: [],
                        css: '',
                        innerCls: '',
                        record: rcd,
                        recordIndex: -1,
                        style: '',
                        tdAttr: '',
                        tdCls: '',
                        unselectableAttr: 'unselectable="on"',
                        'value': value
                    };
                },
                // Use the getSummary from Ext 4.1.3.  This function for 4.2.1 has been changed without updating the documentation
                // In 4.2.1, group is a group object from the store (specifically grid.store.groups[i].items).
                /**
                 * Get the summary data for a field.
                 * @private
                 * @param {Ext.data.Store} store The store to get the data from
                 * @param {String/Function} type The type of aggregation. If a function is specified it will
                 * be passed to the stores aggregate function.
                 * @param {String} field The field to aggregate on
                 * @param {Boolean} group True to aggregate in grouped mode
                 * @return {Number/String/Object} See the return type for the store functions.
                 */
                getSummary: function(store, type, field, group) {
                    if (type) {
                        if (Ext.isFunction(type)) {
                            return store.aggregate(type, null, group, [field]);
                        }

                        switch (type) {
                            case 'count':
                                return store.count(group);
                            case 'min':
                                return store.min(field, group);
                            case 'max':
                                return store.max(field, group);
                            case 'sum':
                                return store.sum(field, group);
                            case 'average':
                                return store.average(field, group);
                            default:
                                return group ? {} : '';
                        }
                    }
                },
                getHtml: function(value, meta) {
                    if (!Ext.isDefined(value)) {
                        value = '&nbsp;';
                    }

                    var html = '<td ';
                    var tdClasses = '';
                    if (meta.tdCls) {
                        tdClasses = meta.tdCls;
                    }
                    if (meta.css) {
                        if (tdClasses.length > 0) {
                            tdClasses += " " + meta.css;
                        }
                        else {
                            tdClasses = meta.css;
                        }
                        if (tdClasses.length > 0) {
                            html += 'class="' + tdClasses + '"';
                        }
                    }
                    if (meta.tdAttr) {
                        html += ' ' + meta.tdAttr;
                    }
                    html += '><div ';
                    if (meta.innerCls) {
                        html += 'class="' + meta.innerCls + '"';
                    }
                    html += ' style="text-align: ' + meta.align + ';';
                    html += meta.style || '';
                    html += '" ';
                    html += meta.unselectableAttr || '';
                    html += '>' + value + '</div></td>';

                    return html;
                }
            }
        ];
    },
    getFeature: function(grid, featureFType) {
        var view = grid.getView();
        var features;

        if (view.features) {
            features = view.features;
        }
        else if (view.featuresMC) {
            features = view.featuresMC.items;
        }
        else if (view.normalView.featuresMC) {
            features = view.normalView.featuresMC.items;
        }

        if (features) {
            for (var i = 0; i < features.length; i++) {
                if (featureFType == 'grouping')
                    if (features[i].ftype == 'grouping' || features[i].ftype == 'groupingsummary')
                        return features[i];
                if (featureFType == 'groupingsummary')
                    if (features[i].ftype == 'groupingsummary')
                        return features[i];
                if (featureFType == 'summary')
                    if (features[i].ftype == 'summary')
                        return features[i];
            }
        }
        return;
    },
    generateBody: function(grid, columns, groupFeature) {
        var groups = [];
        var fields = grid.store.getProxy().getModel().getFields();
        var hideGroupField = true;
        var groupingSummaryFeature = this.getFeature(grid, 'groupingsummary');
        var store = grid.getStore();
        var groupField, body, bodyTpl;

        if (!store.isGrouped() || !groups || !groups.length || !groupFeature) {
            bodyTpl = [
                '<tpl for="this.columns">',
                '{[ this.renderColumn(values, parent.get(values.dataIndex), parent, xindex) ]}',
                '</tpl>'
            ];

            return bodyTpl.join('');
        }

        if (grid instanceof Ext.grid.Panel) {
            groups = store.getGroups();
        }

        hideGroupField = groupFeature.hideGroupedHeader; // bool
        groupField = groupFeature.getGroupField();

        var groupColumn;
        Ext.each(grid.columns, function(col) {
            if (col.dataIndex == groupField)
                groupColumn = col;
        });

        if (!groupFeature || !fields || !groupField) {
            return;
        }

        if (hideGroupField) {
            var removeGroupField = function(item) {
                return (item.name != groupField);
            };
            // Remove group field from fields array.
            // This could be done later in the template,
            // but it is easier to do it here.
            fields = fields.filter(removeGroupField);
        }

        // Use group header template for the header.
        var html = groupFeature.groupHeaderTpl.html || '';

        // #$%! ExtJS 5.x changed the output of getGroups().  It is now an Ext.util.GroupCollection object.
        // We need to transform it back into the 4.x structure which our template expects.
        var newGroups = [];
        for (var i = 0; i < groups.getCount(); i++) {
            var groupObj = groups.getAt(i);
            newGroups.push({
                name: groupObj.getGroupKey(),
                children: groupObj.getRange()
            });
        }
        groups = newGroups;

        bodyTpl = [
            '<tpl for=".">',
            '<tr class="group-header">',
            '<td colspan="{[this.colSpan]}">',
            '{[ this.applyGroupTpl(values) ]}',
            '</td>',
            '</tr>',
            '<tpl for="children">',
            '<tr class="{[xindex % 2 === 0 ? "even" : "odd"]}">',
            '<tpl for="this.columns">',
            '{[ this.renderColumn(values, parent.get(values.dataIndex), parent, xindex) ]}',
            '</tpl>',
            '</tr>',
            '</tpl>',
            '<tpl if="this.hasSummary">',
            '<tr>',
            '<tpl for="this.columns">',
            '{[ this.renderSummary(values, xindex) ]}',
            '</tpl>',
            '</tr>',
            '</tpl>',
            '</tpl>', {
                // XTemplate configuration:
                columns: columns,
                groupColumn: groupColumn,
                colSpan: columns.length,
                grid: grid,
                groupName: "",
                groupTpl: groupFeature.groupHeaderTpl,
                hasSummary: Ext.isObject(groupingSummaryFeature) && groupingSummaryFeature.showSummaryRow,
                summaryFeature: groupingSummaryFeature,
                // XTemplate member functions:
                childCount: function(c) {
                    return c.length;
                },
                renderColumn: function(column, value, rcd, col) {
                    var me = this;
                    var meta = {
                        'align': column.align,
                        'cellIndex': col,
                        'classes': [],
                        'column': column,
                        'css': '',
                        'innerCls': '',
                        'record': rcd,
                        'recordIndex': grid.store.indexOf(rcd),
                        'style': '',
                        'tdAttr': '',
                        'tdCls': '',
                        'unselectableAttr': 'unselectable="on"',
                        'value': value
                    };

                    if (column.renderer) {
                        value = column.renderer.call(me.grid, value, meta, rcd, -1, col - 1, me.grid.store, me.grid.view);
                    }
                    return me.getHtml(value, meta);
                },
                getHtml: function(value, meta) {
                    if (!Ext.isDefined(value)) {
                        value = '&nbsp;';
                    }

                    var html = '<td ';
                    var tdClasses = '';

                    if (meta.tdCls) {
                        //html += 'class="' + meta.tdCls + '"';
                        tdClasses = meta.tdCls;
                    }

                    if (meta.css) {
                        if (tdClasses.length > 0) {
                            tdClasses += " " + meta.css;
                        }
                        else {
                            tdClasses = meta.css;
                        }
                    }

                    if (tdClasses.length > 0) {
                        html += 'class="' + tdClasses + '"';
                    }

                    if (meta.tdAttr) {
                        html += ' ' + meta.tdAttr;
                    }

                    html += '><div ';
                    if (meta.innerCls) {
                        html += 'class="' + meta.innerCls + '"';
                    }

                    html += ' style="text-align: ' + meta.align + ';';
                    html += meta.style || '';
                    html += '" ';
                    html += meta.unselectableAttr || '';
                    html += '>' + value + '</div></td>';

                    return html;
                },
                renderSummary: function(column, colIndex) {
                    var me = this;
                    var value;
                    var summaryObject;

                    if (me.summaryFeature.remoteRoot) {
                        var summaryRecord = me.summaryFeature.summaryRecord || (new me.grid.view.store.model(null, me.grid.view.id + '-summary-record'));
                        if (me.grid.view.store.proxy.reader.rawData) {
                            if (Ext.isArray(me.grid.view.store.proxy.reader.rawData[me.summaryFeature.remoteRoot])) {
                                summaryRecord.set(me.getSummaryRcd(me.grid.view.store.proxy.reader.rawData[me.summaryFeature.remoteRoot], me.grid.store.groupField, me.groupName));
                            }
                            else {
                                summaryRecord.set(me.grid.view.store.proxy.reader.rawData[me.summaryFeature.remoteRoot]);
                            }
                        }
                        value = summaryRecord.get(column.dataIndex);
                    }
                    else {
                        value = me.getSummary(me.grid.store, column.summaryType, column.dataIndex, me.grid.store.isGrouped());
                    }

                    if (Ext.isObject(value)) {
                        value = value[me.groupName];
                    }

                    if (column.summaryRenderer) {
                        summaryObject = me.getSummaryObject42(column, colIndex);
                        value = column.summaryRenderer.call(me.grid,
                            value,
                            me.getSummaryObject42(column, colIndex),
                            me.getSummaryRecord42(), -1,
                            colIndex,
                            me.grid.store,
                            me.grid.view);

                        return me.getHtml(value, summaryObject);
                    }
                    else {
                        if (!Ext.isDefined(value) || value == 0) {
                            value = '&nbsp;';
                        }
                    }

                    return '<td><div>' + value + '</div></td>';
                },
                applyGroupTpl: function(rcd) {
                    var me = this;
                    // The only members in rcd are name and children
                    me.groupName = rcd.name;
                    rcd.groupField = me.grid.store.groupField;

                    var meta = {
                        'align': '',
                        'cellIndex': -1,
                        'classes': [],
                        'column': me.groupColumn,
                        'css': '',
                        'innerCls': '',
                        'record': rcd.children[0],
                        'recordIndex': me.grid.store.indexOf(rcd.children[0]),
                        'style': '',
                        'tdAttr': '',
                        'tdCls': '',
                        'unselectableAttr': 'unselectable="on"',
                        'value': rcd.name
                    };

                    if (me.groupColumn) {
                        rcd.columnName = me.groupColumn.text;
                    }
                    else {
                        rcd.columnName = me.groupField;
                    }

                    rcd.groupValue = rcd.name;

                    if (me.groupColumn && me.groupColumn.renderer) {
                        rcd.renderedGroupValue = me.groupColumn.renderer.call(me.grid, rcd.name, meta, rcd.children[0], -1, -1, me.grid.store, me.grid.view);
                    }
                    else {
                        rcd.renderedGroupValue = rcd.name;
                    }
                    //rcd.rows = null;  // We don't support rcd.rows yet
                    return me.groupTpl.apply(rcd);
                },
                getSummaryObject: function(align) {
                    var me = this;
                    var summaryValues = {};
                    for (var i = 0; i < me.columns.length; i++) {
                        var valueObject = me.getSummary(me.grid.store, me.columns[i].summaryType, me.columns[i].dataIndex, me.grid.store.isGrouped());
                        if (!Ext.isDefined(valueObject)) {
                            continue; // Do nothing
                        }
                        else if (Ext.isObject(valueObject)) {
                            summaryValues[columns[i].id] = valueObject[me.groupName];
                        }
                        else {
                            summaryValues[columns[i].id] = valueObject;
                        }
                    }
                    summaryValues['style'] = "text-align:" + align + ';';
                    return summaryValues;
                },
                getSummaryRecord42: function() {
                    var me = this;
                    var rcd = Ext.create(me.grid.store.model);
                    for (var i = 0; i < me.columns.length; i++) {
                        var valueObject = me.getSummary(me.grid.store, me.columns[i].summaryType, me.columns[i].dataIndex, me.grid.store.isGrouped());
                        if (!Ext.isDefomed(valueObject)) {
                            continue; // Do nothing
                        }
                        else if (Ext.isObject(valueObject)) {
                            rcd.set(me.columns[i].dataIndex, valueObject[me.groupName]);
                        }
                        else {
                            rcd.set(me.columns[i].dataIndex, valueObject);
                        }
                    }
                    return rcd;
                },
                getSummaryObject42: function(column, colIndex) {
                    return {
                        align: column.align,
                        cellIndex: colIndex,
                        classes: [],
                        css: '',
                        innerCls: '',
                        record: this.getSummaryRecord42(),
                        recordIndex: -1,
                        style: '',
                        tdAttr: '',
                        tdCls: '',
                        unselectableAttr: 'unselectable="on"',
                        value: '&#160;'
                    };
                },
                // Use the getSummary from Ext 4.1.3.  This function for 4.2.1 has been changed without updating the documentation
                // In 4.2.1, group is a group object from the store (specifically grid.store.groups[i].items).
                /**
                 * Get the summary data for a field.
                 * @private
                 * @param {Ext.data.Store} store The store to get the data from
                 * @param {String/Function} type The type of aggregation. If a function is specified it will
                 * be passed to the stores aggregate function.
                 * @param {String} field The field to aggregate on
                 * @param {Boolean} group True to aggregate in grouped mode
                 * @return {Number/String/Object} See the return type for the store functions.
                 */
                getSummary: function(store, type, field, group) {
                    if (!type) {
                        return;
                    }

                    if (Ext.isFunction(type)) {
                        return store.aggregate(type, null, group, [field]);
                    }

                    switch (type) {
                        case 'count':
                            return store.count(group);
                        case 'min':
                            return store.min(field, group);
                        case 'max':
                            return store.max(field, group);
                        case 'sum':
                            return store.sum(field, group);
                        case 'average':
                            return store.average(field, group);
                        default:
                            return group ? {} : '';
                    }
                },
                // return the record having fieldName == value
                getSummaryRcd: function(rawDataObject, fieldName, value) {
                    if (Ext.isArray(rawDataObject)) {
                        for (var i = 0; i < rawDataObject.length; i++) {
                            if (rawDataObject[i][fieldName] && rawDataObject[i][fieldName] == value) {
                                return rawDataObject[i];
                            }
                        }
                        return;
                    }
                    else {
                        if (rawDataObject.data[fieldName]) {
                            return rawDataObject;
                        }
                        else {
                            return;
                        }
                    }
                }
            }
        ];

        return Ext.create('Ext.XTemplate', bodyTpl).apply(groups);
    }
});
