window.Bizweb || (window.Bizweb = {});
(function () {
    Bizweb.Utility = {
        getParameter: function (name) {
            name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
            var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
                results = regex.exec(location.search);
            return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
        }
    }
    Bizweb.Template = {
        SHIPPING_METHOD: '<div class="content-box__row"><div class="radio-wrapper"><div class="radio__input"><input class="input-radio" type="radio" value="{{shipping_method_value}}" name="ShippingMethod" id="shipping_method_{{shipping_method_id}}" bind="shippingMethod" bind-event-change="changeShippingMethod()" fee="{{shipping_method_fee}}" /></div><label class="radio__label" for="shipping_method_{{shipping_method_id}}"> <span class="radio__label__primary">{{shipping_method_name}}</span><span class="radio__label__accessory"><span class="content-box__emphasis">{{shipping_method_fee_text}}</span></span></label> </div> <!-- /radio-wrapper--> </div>'
    }
    Bizweb.StoreCheckout = function () {
        function StoreCheckout(e, options) {
            if (!options)
                options = {};

            this.ele = e;
            this.existCode = options.existCode;
            this.totalOrderItemPrice = options.totalOrderItemPrice;
            this.discount = options.discount;
            this.shippingFee = options.shippingFee;
            this.freeShipping = options.freeShipping;
            this.requiresShipping = options.requiresShipping;
            this.code = options.code;
            this.inValidCode = false;
            this.discountShipping = false;
            //this.shippingMethods = [];
            this.loadedShippingMethods = false;
            this.settingLanguage = options.settingLanguage;
            this.invalidEmail = false;
            this.moneyFormat = options.moneyFormat;
            this.discountLabel = options.discountLabel;
            this.districtPolicy = options.districtPolicy;
            this.district = options.district;
            this.billingLatLng = {};
            this.shippingLatLng = {};
            this.checkToEnableScrollIndicator();
            this.customerAddress = null;
            this.province = options.province;
            this.token = options.token;
            this.email = options.email;
            this.otherAddress = options.otherAddress;
            this.shippingId = options.shippingId;
            this.shippingMethods = options.shippingMethods;

            this.$ajax = null;
            this.$calculateFee = null;
            this.$reCalculateFee = null;
            this.ajaxAbandonedTimeout = null;

            this.bindRequiredOtherAddress();

            this.reduction_code = options.reductionCode != "";
        };

        function isEmail(email) {
            var regex = /^([a-zA-Z0-9_.+-])+\@(([a-zA-Z0-9-])+\.)+([a-zA-Z0-9]{2,4})+$/;
            return regex.test(email);
        }

        StoreCheckout.prototype.bindRequiredOtherAddress = function () {
            if (this.otherAddress) {
                $("#_shipping_address_last_name").prop('required', true);
                $("#_shipping_address_phone").prop('required', true);
                $("#_shipping_address_address1").prop('required', true);
                $("#shippingProvince").prop('required', true);
                $("#shippingDistrict").prop('required', true);
            } else {
                $("#_shipping_address_last_name").removeAttr('required');
                $("#_shipping_address_phone").removeAttr('required');
                $("#_shipping_address_address1").removeAttr('required');
                $("#shippingProvince").removeAttr('required');
                $("#shippingDistrict").removeAttr('required');
            }
        }

        StoreCheckout.prototype.handleClick = function (element) {
            $(element).closest(".field__input-wrapper").find(".field__input").focus();
        }

        StoreCheckout.prototype.handleFocus = function (element) {
            $(element).closest(".field__input-wrapper").addClass("js-is-focused")
        }

        StoreCheckout.prototype.handleFieldBlur = function (element) {
            $(element).closest(".field__input-wrapper").removeClass("js-is-focused")
        }

        StoreCheckout.prototype.checkToEnableScrollIndicator = function () {
            var $summaryWrapper = $(".summary-product");
            var $productTable = $(".product-table");

            if ($summaryWrapper.height() < $productTable.height()) {
                $summaryWrapper.addClass("order-summary--is-scrollable");

                $(".order-summary--is-scrollable").scroll(function () {
                    $(this).removeClass("order-summary--is-scrollable");
                });
            }
        }

        StoreCheckout.prototype.changeCustomerAddress = function (model) {
            if (!model.id) {
                model = {
                    "address1": null,
                    "address2": null,
                    "city": "",
                    "full_name": "",
                    "phone": "",
                    "province": "",
                    "province_code": "",
                    "district": "",
                    "district_code": "",
                };
                this.billing_address = model;
                this.shipping_address = model;
            }

            this.customerAddress = model;

            $("select[name='BillingProvinceId'] option").filter(function () {
                return $(this).text() == model.city;
            }).prop('selected', true).trigger("change");
        }

        StoreCheckout.prototype.changeEmail = function () {
            var email = $("#_email").val();
            if (isEmail(email)) {
                if (!!this.code) {
                    this.caculateShippingFee();
                }

                this.abandonedCheckout();
            }
        }

        StoreCheckout.prototype.saveAbandoned = function () {
            this.abandonedCheckout();
        }

        StoreCheckout.prototype.billingCountryChange = function (designThemeId) {
            if (!this.ortherAddress) {
                var that = this;
                if (this.show_country) {
                    var url = "/checkout/getprovinces?countryId=" + that.BillingCountryId;
                    if (!!designThemeId) {
                        url += "&designThemeId=" + designThemeId;
                    }
                    $.ajax({
                        url: url,
                        success: function (data) {
                            var html = "<option value=''>--- Chọn tỉnh th� nh ---</option>";

                            for (var i = 0; i < data.length; i++) {
                                var province = data[i];
                                var selected = (that.province === province.name) || (that.customerAddress != null && that.customerAddress.province === province.name);
                                html += "<option value='" + province.id + "'" + (selected ? "selected='selected'" : "") + ">" + province.name + "</option>";
                            }

                            $("select[name='BillingProvinceId']").empty().html(html);
                            $("select[name='BillingProvinceId']").trigger("change");
                        }
                    });
                }
            }
        }

        StoreCheckout.prototype.billingProviceChange = function (designThemeId) {
            if (!this.otherAddress) {
                var that = this;
                if (this.show_district) {
                    var url = "/checkout/getdistricts?provinceId=" + that.BillingProvinceId;
                    if (!!designThemeId) {
                        url += "&designThemeId=" + designThemeId;
                    }
                    $.ajax({
                        url: url,
                        success: function (data) {
                            var html = "<option value=''>--- Chọn quận huyện ---</option>";

                            for (var i = 0; i < data.length; i++) {
                                var district = data[i];
                                var selected = (that.district === district.name) || (that.customerAddress != null && that.customerAddress.district === district.name);
                                html += "<option value='" + district.id + "'" + (selected ? "selected='selected'" : "") + ">" + district.name + "</option>"
                            }

                            $("select[name='BillingDistrictId']").empty().html(html);
                            $("select[name='BillingDistrictId']").trigger("change");
                        }
                    });
                }
                else {
                    this.caculateShippingFee(designThemeId);
                }
            }

            this.abandonedCheckout();
        }

        StoreCheckout.prototype.caculateShippingFee = function (designThemeId) {

            if (this.$calculateFee != null) {
                this.$calculateFee.abort();
            }

            var that = this;

            if (this.settingLanguage != "vi") {
                var provinceId = 0;
                var districtId = 0;
            } else {
                var provinceId = that.otherAddress ? that.ShippingProvinceId : that.BillingProvinceId;
                var districtId = that.otherAddress ? that.ShippingDistrictId : that.BillingDistrictId;
            }
            var shippingMethod = $("[name='ShippingMethod']:checked").val();

            var email = $("#_email").val();

            var url = "/checkout/getshipping/" + that.token;
            if (!!designThemeId) {
                url += "?designThemeId=" + designThemeId;
            }

            data = {
                provinceId: provinceId,
                districtId: districtId,
                code: that.code,
                shippingMethod: shippingMethod,
                email: email
            };

            if (this.reduction_code) {
                data.code = null;
            }

            this.$calculateFee = $.ajax({
                url: url,
                type: "POST",
                data: data,
                success: function (data) {
                    that.loadedShippingMethods = true;

                    if (data.error) {
                        that.shippingMethods = [];
                        Twine.refreshImmediately();
                    }
                    else {
                        that.existCode = data.exist_code;

                        if (that.code && !that.existCode && !that.reduction_code) {
                            that.inValidCode = !that.existCode;
                        }
                        else {
                            that.inValidCode = false;
                        }

                        that.freeShipping = data.free_shipping;
                        //that.code = data.code;
                        that.discount = data.discount;
                        that.totalOrderItemPrice = data.total_line_item_price;

                        if (that.requiresShipping)
                            that.shippingMethods = data.shipping_methods;

                        that.discountShipping = data.discount_shipping;

                        $(".shipping-method .content-box").empty();

                        for (var index in that.shippingMethods) {
                            var shippingMethod = that.shippingMethods[index];
                            var template = Bizweb.Template.SHIPPING_METHOD.replace(/{{shipping_method_value}}/g, shippingMethod.value);
                            template = template.replace(/{{shipping_method_name}}/g, shippingMethod.name);
                            template = template.replace(/{{shipping_method_fee}}/g, shippingMethod.fee);
                            template = template.replace(/{{shipping_method_id}}/g, shippingMethod.id);
                            template = template.replace(/{{shipping_method_fee_text}}/g, (shippingMethod.fee > 0 ? money(shippingMethod.fee, that.moneyFormat) : that.discountLabel));
                            $(".shipping-method .content-box").append(template);
                        }

                        Twine.unbind($(".shipping-method .content-box").get(0));
                        Twine.bind($(".shipping-method .content-box").get(0));
                        Twine.refreshImmediately();

                        $("[name=ShippingMethod][value='" + data.shipping_method + "']").click();
                        //$("[name=ShippingMethod][value='" + data.shipping_method + "']").trigger("change");
                        that.applyShippingMethod();
                    }
                }
            });

            return false;
        }

        StoreCheckout.prototype.shippingCountryChange = function (designThemeId) {
            if (!this.ortherAddress) {
                var that = this;
                if (this.show_country) {

                    var url = "/checkout/getprovinces?countryId=" + that.ShippingCountryId;
                    if (!!designThemeId) {
                        url += "&designThemeId=" + designThemeId;
                    }

                    $.ajax({
                        url: url,
                        success: function (data) {
                            var html = "<option value=''>--- Chọn tỉnh th� nh ---</option>";

                            for (var i = 0; i < data.length; i++) {
                                var province = data[i];
                                var selected = (that.province === province.name) || (that.customerAddress != null && that.customerAddress.province === province.name);
                                html += "<option value='" + province.id + "'" + (selected ? "selected='selected'" : "") + ">" + province.name + "</option>";
                            }

                            $("select[name='ShippingProvinceId']").empty().html(html);
                            $("select[name='ShippingProvinceId']").trigger("change");
                        }
                    });
                }
            }
        }

        StoreCheckout.prototype.shippingProviceChange = function (designThemeId) {
            if (this.otherAddress) {
                var that = this;
                if (this.show_district) {
                    this.showShippingDistrict(designThemeId);
                }
                else {
                    this.caculateShippingFee(designThemeId);
                }
            } else {
                var initDistrict = $("select[name='ShippingDistrictId'] >option").length > 0 ? false : true;
                if (initDistrict) {
                    if (this.show_district) {
                        this.showShippingDistrict(designThemeId);
                    }
                }
            }
        }

        StoreCheckout.prototype.showShippingDistrict = function (designThemeId) {
            var that = this;
            var url = "/checkout/getdistricts?provinceId=" + that.ShippingProvinceId;
            if (!!designThemeId) {
                url += "&designThemeId=" + designThemeId;
            }
            $.ajax({
                url: url,
                async: false,
                success: function (data) {
                    var html = "<option value=''>--- Chọn quận huyện ---</option>";

                    for (var i = 0; i < data.length; i++) {
                        var district = data[i];
                        var selected = that.district === district.name;
                        html += "<option value='" + district.id + "'" + (selected ? "selected='selected'" : "") + ">" + district.name + "</option>"
                    }

                    $("select[name='ShippingDistrictId']").empty().html(html);
                    $("select[name='ShippingDistrictId']").trigger("change");
                }
            });
            this.abandonedCheckout();
        }

        StoreCheckout.prototype.shippingDistrictChange = function (designThemeId) {
            if (this.otherAddress) {
                this.caculateShippingFee(designThemeId);
                this.abandonedCheckout();
            }
        }

        StoreCheckout.prototype.billingDistrictChange = function (designThemeId) {
            if (!this.otherAddress) {
                this.caculateShippingFee(designThemeId);
                this.abandonedCheckout();
            }
        }

        StoreCheckout.prototype.changeOtherAddress = function (element) {
            element.value = this.otherAddress;
            if (this.otherAddress) {
                $("#_shipping_address_last_name").prop('required', true);
                $("#_shipping_address_phone").prop('required', true);
                $("#_shipping_address_address1").prop('required', true);
                $("#shippingProvince").prop('required', true);
                $("#shippingDistrict").prop('required', true);
                $("select[name='ShippingProvinceId']").trigger("change");
            } else {
                if ($(".help-block.with-errors > ul").length > 0) {
                    $(".help-block.with-errors").empty();
                }
                $("#_shipping_address_last_name").removeAttr('required');
                $("#_shipping_address_phone").removeAttr('required');
                $("#_shipping_address_address1").removeAttr('required');
                $("#shippingProvince").removeAttr('required');
                $("#shippingDistrict").removeAttr('required');
                $("select[name='BillingProvinceId']").trigger("change");
            }
            this.abandonedCheckout();
        }

        StoreCheckout.prototype.applyShippingMethod = function () {
            this.shippingMethod = $("[name='ShippingMethod']:checked").val();
            var shippingFee = parseFloat($("[name='ShippingMethod']:checked").attr("fee"));

            if (this.discountShipping) {
                if (shippingFee <= 0) {
                    this.freeShipping = true;
                    this.discount = shippingFee;
                } else {
                    this.freeShipping = false;
                    this.discount = 0;
                }
            } else {
                if (shippingFee <= 0) {
                    this.freeShipping = true;
                } else {
                    this.freeShipping = false;
                }
            }

            this.shippingFee = shippingFee;
            Twine.refreshImmediately();
        }

        StoreCheckout.prototype.changeShippingMethod = function () {
            this.shippingMethod = $("[name='ShippingMethod']:checked").val();
            var shippingFee = parseFloat($("[name='ShippingMethod']:checked").attr("fee"));

            if (this.discountShipping) {
                if (shippingFee <= 0) {
                    this.freeShipping = true;
                    this.discount = shippingFee;
                } else {
                    this.freeShipping = false;
                    this.discount = 0;
                }
            } else {
                if (shippingFee <= 0) {
                    this.freeShipping = true;
                } else {
                    this.freeShipping = false;
                }
            }

            this.shippingFee = shippingFee;
            this.reCalculateShippingFeeChangeShippingMethod();

            Twine.refreshImmediately();
        }

        StoreCheckout.prototype.reCalculateShippingFeeChangeShippingMethod = function () {
            if (this.$reCalculateFee != null) {
                this.$reCalculateFee.abort();
            }

            var that = this;

            if (this.settingLanguage != "vi") {
                var provinceId = 0;
                var districtId = 0;
            } else {
                var provinceId = that.otherAddress ? that.ShippingProvinceId : that.BillingProvinceId;
                var districtId = that.otherAddress ? that.ShippingDistrictId : that.BillingDistrictId;
            }
            var shippingMethod = $("[name='ShippingMethod']:checked").val();

            var email = $("#_email").val();

            var url = "/checkout/getshipping/" + that.token;

            data = {
                provinceId: provinceId,
                districtId: districtId,
                code: that.code,
                shippingMethod: shippingMethod,
                email: email
            };

            this.$reCalculateFee = $.ajax({
                url: url,
                type: "POST",
                data: data,
                success: function (data) {
                }
            });

            return false;
        }

        StoreCheckout.toggleOrderSummary = function (e) {
            var $toggle = $(e);
            var $container = $(".order-summary--product-list");

            $container.wrapInner("<div />");

            var i = $container.height();
            var r = $container.find("> div").height();
            var n = 0 === i ? r : 0;

            $container.css("height", i);
            $container.find("> div").contents().unwrap();

            setTimeout(function (i) {
                return function () {
                    $toggle.toggleClass("order-summary-toggle--hide");
                    $container.toggleClass("order-summary--is-collapsed");
                    $container.addClass("order-summary--transition");
                    $container.css("height", n);
                }
            }(this), 0);

            $container.one("webkitTransitionEnd oTransitionEnd otransitionend transitionend msTransitionEnd", function (t) {
                return function (t) {
                    if ($container.is(t.target)) {
                        $container.removeClass("order-summary--transition");
                        $container.removeAttr("style");
                    }
                }
            }(this))
        }

        StoreCheckout.prototype.removeCode = function (designThemeId) {
            this.code = "";
            this.caculateShippingFee(designThemeId);
        }

        StoreCheckout.prototype.paymentCheckout = function (googleApiKey) {
            $(".btn-checkout").button('loading');
            var that = this;
            var listAPIKey = googleApiKey;
            if (listAPIKey !== null && listAPIKey !== "" && listAPIKey !== 'undefined') {
                listAPIKey = listAPIKey.split(";");
                var apiKey = listAPIKey[Math.floor(Math.random() * listAPIKey.length)];
                var urlGoogleMapsApi = "https://maps.googleapis.com/maps/api/js?key=" + apiKey;

                that.loadScriptGoogleMapApi(urlGoogleMapsApi, function (resultLoadApi) {
                    if (resultLoadApi === true) {
                        var billingAddress = that.getBillingAddress();
                        if (that.otherAddress) {
                            var shippingAddress = that.getShippingAddress();

                            that.getLatLong(billingAddress, function (billingAddressResult) {
                                if (billingAddressResult === false) {
                                    that.setBillingLatLng(false);
                                } else {
                                    that.setBillingLatLng(billingAddressResult);
                                }

                                that.getLatLong(shippingAddress, function (shippingAddressResult) {
                                    if (shippingAddressResult === false) {
                                        that.setShippingLatLng(false);
                                        that.returnCheckout();
                                    }
                                    else {
                                        that.setShippingLatLng(shippingAddressResult);
                                        that.returnCheckout();
                                    }
                                });
                            });
                        }
                        else {
                            that.getLatLong(billingAddress, function (billingAddressResult) {
                                if (billingAddressResult === false) {
                                    that.setBillingLatLng(false);
                                    that.setShippingLatLng(false);
                                    that.returnCheckout();
                                } else {
                                    that.setBillingLatLng(billingAddressResult);
                                    that.setShippingLatLng(billingAddressResult);
                                    that.returnCheckout();
                                }
                            });
                        }
                    }
                    else {
                        that.setBillingLatLng(false);
                        that.setShippingLatLng(false);
                        that.returnCheckout();
                    }
                });
            }
            else {
                that.setBillingLatLng(false);
                that.setShippingLatLng(false);
                that.returnCheckout();
            }
        }

        StoreCheckout.prototype.loadScriptGoogleMapApi = function (url, callback) {
            jQuery.ajax({
                timeout: 3000,
                url: url,
                dataType: 'script',
                async: true,
                global: false,
                success: function () {
                    callback(true);
                },
                error: function () {
                    callback(false);
                },
            });
        }

        StoreCheckout.prototype.getBillingAddress = function () {
            var that = this;
            var address = "";

            if (that.billing_address.address1) {
                address += that.billing_address.address1 + ", ";
            }

            if (that.BillingDistrictId) {
                var districtName = $("#billingDistrict").find(":selected").text();
                if (districtName) {
                    address += districtName + ", ";
                }
            }
            if (that.BillingProvinceId) {
                var provinceName = $("#billingProvince").find(":selected").text();
                if (provinceName) {
                    address += provinceName;
                }
            }

            if (that.BillingCountryId) {
                var countryName = $("#billingCountry").find(":selected").text();
                if (countryName) {
                    address += ", " + countryName;
                }
            }

            return address;
        }

        StoreCheckout.prototype.getShippingAddress = function () {
            var that = this;
            var address = "";
            if (that.shipping_address.address1) {
                address += that.shipping_address.address1 + ", ";
            }

            if (that.ShippingDistrictId) {
                var districtName = $("#shippingDistrict").find(":selected").text();
                if (districtName) {
                    address += districtName + ", ";
                }
            }
            if (that.ShippingProvinceId) {
                var provinceName = $("#shippingProvince").find(":selected").text();
                if (provinceName) {
                    address += provinceName;
                }
            }

            if (that.ShippingCountryId) {
                var countryName = $("#shippingCountry").find(":selected").text();
                if (countryName) {
                    address += ", " + countryName;
                }
            }

            return address;
        }

        StoreCheckout.prototype.toggle = function (e, container) {
            var $toggle = $(e);
            var $container = $(container);

            $container.wrapInner("<div />");

            var i = $container.height();
            var r = $container.find("> div").height();
            var n = 0 === i ? r : 0;

            $container.css("height", i);
            $container.find("> div").contents().unwrap();

            setTimeout(function (i) {
                return function () {
                    $toggle.toggleClass("open");
                    $container.toggleClass("mobile--is-expanded mobile--is-collapsed");
                    $container.addClass("mobile--transition");
                    $container.css("height", n);
                }
            }(this), 0);

            $container.one("webkitTransitionEnd oTransitionEnd otransitionend transitionend msTransitionEnd", function (t) {
                return function (t) {
                    if ($container.is(t.target)) {
                        $container.removeClass("mobile--transition");
                        $container.removeAttr("style");
                    }
                }
            }(this))
        }

        StoreCheckout.prototype.getLatLong = function (address, callback) {
            // If adress is not supplied, use default value 'Ferrol, Galicia, Spain'
            address = address || '266 Đội Cấn, Ba Đình, H�  Nội';
            // Initialize the Geocoder
            if (typeof google !== 'undefined') {
                geocoder = new google.maps.Geocoder();
                if (geocoder && geocoder.geocode) {
                    geocoder.geocode({
                        'address': address
                    }, function (results, status) {
                        if (status == google.maps.GeocoderStatus.OK) {
                            callback(results[0]);
                        }
                        else {
                            callback(false);
                        }
                    });
                }
                else {
                    callback(false);
                }
            }
            else {
                callback(false);
            }
        }

        StoreCheckout.prototype.setBillingLatLng = function (result) {
            if (result == false) {
                this.billingLatLng.Lat = "";
                this.billingLatLng.Lng = "";
            }
            else {
                this.billingLatLng.Lat = result.geometry.location.lat();
                this.billingLatLng.Lng = result.geometry.location.lng();
            }
        }

        StoreCheckout.prototype.setShippingLatLng = function (result) {
            if (result == false) {
                this.shippingLatLng.Lat = "";
                this.shippingLatLng.Lng = "";
            }
            else {
                this.shippingLatLng.Lat = result.geometry.location.lat();
                this.shippingLatLng.Lng = result.geometry.location.lng();
            }
        }

        StoreCheckout.prototype.returnCheckout = function () {
            var that = this;
            var $form = $("form.formCheckout");

            var browserWidth = $(window).width();
            var browserHeight = $(window).height();
            $form.append('<input type="hidden" type="text" class="form-control" id="BillingAddressLat" name="BillingAddress.Latitude" value="' + that.billingLatLng.Lat + '" />');
            $form.append('<input type="hidden" type="text" class="form-control" id="BillingAddressLong" name="BillingAddress.Longitude" value="' + that.billingLatLng.Lng + '" />');
            $form.append('<input type="hidden" type="text" class="form-control" id="ShippingAddressLat" name="ShippingAddress.Latitude" value="' + that.shippingLatLng.Lat + '" />');
            $form.append('<input type="hidden" type="text" class="form-control" id="ShippingAddressLong" name="ShippingAddress.Longitude" value="' + that.shippingLatLng.Lng + '" />');
            $form.append('<input type="hidden" type="text" class="form-control" id="BrowserWidth" name="BrowserWidth" value="' + browserWidth + '" />');
            $form.append('<input type="hidden" type="text" class="form-control" id="BrowserHeight" name="BrowserHeight" value="' + browserHeight + '" />');

            var prvdId = parseInt($(".payment-methods .input-radio:checked").attr("data-check-id"));
            if (prvdId == 2) {
                if (!$("#onepay_visa_confirm").is(":checked")) {
                    alert("Bạn chưa đồng ý với các điều khoản v�  dịch vụ của Onepay!");
                    $("#BillingAddressLat").remove();
                    $("#BillingAddressLong").remove();
                    $("#ShippingAddressLat").remove();
                    $("#ShippingAddressLong").remove();
                    $("#BrowserWidth").remove();
                    $("#BrowserHeight").remove();
                    $(".btn-checkout").button('reset');
                    return false;
                }
            } else if (prvdId == 1) {
                if (!$("#onepay_atm_confirm").is(":checked")) {
                    alert("Bạn chưa đồng ý với các điều khoản v�  dịch vụ của Onepay!");
                    $("#BillingAddressLat").remove();
                    $("#BillingAddressLong").remove();
                    $("#ShippingAddressLat").remove();
                    $("#ShippingAddressLong").remove();
                    $("#BrowserWidth").remove();
                    $("#BrowserHeight").remove();
                    $(".btn-checkout").button('reset');
                    return false;
                }
            } else if (prvdId == 11) {
                $form.validator('validate');
                if ($(".help-block.with-errors > ul").length <= 0) {
                    var url = window.location.href;
                    var method = "POST";
                    NProgress.start();
                    $.ajax({
                        url: url,
                        type: method,
                        global: false,
                        data: $form.serialize(),
                        success: function (data) {
                            if (data.error == "0") {
                                $(".trigger-moca-error-modal").trigger("click");
                            } else if (data.error == "fail") {
                                window.location.href = "/checkout/failure/" + data.order_id;
                            } else {
                                $("#moca-modal iframe").attr("src", data.moca_iframe_url);

                                $(".trigger-moca-modal").trigger("click");
                            }
                            NProgress.done();
                        }
                    });
                }
                $("#BillingAddressLat").remove();
                $("#BillingAddressLong").remove();
                $("#ShippingAddressLat").remove();
                $("#ShippingAddressLong").remove();
                $("#BrowserWidth").remove();
                $("#BrowserHeight").remove();
                $(".btn-checkout").button('reset');
                return false;
            }

            $form.validator('validate');
            if ($(".help-block.with-errors > ul").length <= 0) {
                //$form.submit();
                var url = window.location.href;
                var method = "POST";
                $.ajax({
                    url: url,
                    type: method,
                    global: true,
                    data: $form.serialize(),
                    success: function (data) {
                        if (data.success == true) {
                            window.location.href = data.url_redirect;
                        }
                        else {
                            if (data.errors != null && data.errors.length > 0) {
                                var html = "";
                                for (i = 0; i < data.errors.length; i++) {
                                    html += "<li>" + data.errors[i] + "</li>";
                                }
                            }
                            $(".sidebar__content .has-error .help-block > ul").html(html);
                            $(".btn-checkout").button('reset');
                            $("#BillingAddressLat").remove();
                            $("#BillingAddressLong").remove();
                            $("#ShippingAddressLat").remove();
                            $("#ShippingAddressLong").remove();
                            $("#BrowserWidth").remove();
                            $("#BrowserHeight").remove();
                            return;
                        }
                    }
                });
            }
            else {
                $("#BillingAddressLat").remove();
                $("#BillingAddressLong").remove();
                $("#ShippingAddressLat").remove();
                $("#ShippingAddressLong").remove();
                $("#BrowserWidth").remove();
                $("#BrowserHeight").remove();
                $(".btn-checkout").button('reset');
            }
        }

        StoreCheckout.prototype.abandonedCheckout = function () {

            var $form = $("form.formCheckout");
            var url = window.location.href;
            var method = "POST";
            if (this.$ajax != null) {
                this.$ajax.abort();
            }

            if (this.ajaxAbandonedTimeout != null) {
                clearTimeout(this.ajaxAbandonedTimeout);
            }
            var $that = this;
            this.ajaxAbandonedTimeout = setTimeout(function () {
                $that.$ajax = $.ajax({
                    url: url,
                    type: method,
                    global: false,
                    data: $form.serialize() + "&_method=patch",
                    success: function (data) {
                    }
                });
            }, 3000);
        }

        return StoreCheckout;
    }();
    Bizweb.CheckoutProblems = function () {
        function CheckoutProblems(e, options) {
            if (!options)
                options = {};

            this.token = options.token;
        }

        CheckoutProblems.prototype.removeItem = function (e) {
            var $form = $(e).parent('form.edit_checkout');
            var $that = this;
            $.ajax({
                url: '/checkout/' + $that.token,
                type: 'POST',
                data: $form.serialize(),
                success: function (data) {
                    window.location = "/checkout/" + data.token;
                }
            })
        };

        CheckoutProblems.prototype.continueCheckout = function () {
            var $form = $("#form_stock_problems_to_checkout");
            var $that = this;
            $.ajax({
                url: '/checkout/' + $that.token,
                type: 'POST',
                async: false,
                data: $form.serialize(),
                success: function (data) {
                    window.location = "/checkout/" + data.token;
                }
            })
        };

        return CheckoutProblems;
    }();
}).call(this)