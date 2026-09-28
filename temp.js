jQuery(document).ready(function() {
  jQuery(".eme_type").each(function(index) {
    let types = jQuery(this).text().split("||");
    let classes = jQuery(".eme_types_classes", this).text().split("||");
    console.log(types+classes);
    jQuery(this).text("<ul>");
    jQuery.each(types, function( i, val ) {
      jQuery(this).append('<li class="'+classes[i]+'">'+val+'</li>');
    });
    jQuery(this).append("</ul>");
  });
});
