#!/bin/bash
#
# Jappix - An open social platform
#
# This script extracts a PHP-independent version of
# Jappix Mini under the AGPL or the MPLv2.
#
# -------------------------------------------------
#
# License: WTFPL
# Author: Leberwurscht
#

#
# Usage example:
# --------------
#
# - $ ./extract_mini.sh
# - move the newly created mini/ directory onto your webserver
# - Create index.html:
#     <script type="text/javascript" src="https://ajax.googleapis.com/ajax/libs/jquery/1.4.4/jquery.min.js"></script>
#     <script type="text/javascript" src="/mini/js/mini.js"></script>
#     <script type="text/javascript">
#       jQuery(document).ready(function() {
#         JAPPIX_STATIC="/mini/";
#         HOST_BOSH="https://bind.jappix.com/"
#         launchMini(true, false, "-server-", "-username-", "-password-");
#       });
#     </script>
#

# standard settings
TARGET_DIR=mini/
LICENSE=MPL

# parse command line options
while getopts "t:l:h" opt; do
  case $opt in
    t) # target directory
      TARGET_DIR="$OPTARG"
      ;;
    l) # license setting
      case $OPTARG in
        MPL)
          LICENSE=MPL
          ;;
        AGPL)
          LICENSE=AGPL
          ;;
        *)
          echo "Invalid license '$OPTARG' - need MPL or AGPL" >&2
          exit 1
          ;;
      esac
      ;;
    h) # help
      echo "Usage: $0 [-h] [-t TARGET_DIR] [-l MPL|AGPL]" >&2
      exit 1
      ;;
  esac
done

# set compatible licenses and file header
if [ "$LICENSE" == "MPL" ]; then
  COMPATIBLE_LICENSES="PD MPL MIT WTFPL"
  LICENSE_HEADER='/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *'
fi
if [ "$LICENSE" == "AGPL" ]; then
  COMPATIBLE_LICENSES="PD MPL MIT WTFPL AGPL GPL"
  LICENSE_HEADER='/*
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *'
fi

LICENSE_HEADER="$LICENSE_HEADER"'
 *
 * This compound file may be composed of several subfiles by different authors.
 * The particular authors, copyright information, disclaimers and alternative
 * licenses for the subfiles are indicated in separate headers.
 *
 */'

# create directory
if [ -e "$TARGET_DIR" ]; then
  echo "Target directory '$TARGET_DIR' already exists. Doing nothing." >&2
  exit 1
else
  echo "Extracting Jappix Mini into directory '$TARGET_DIR'" >&2
  mkdir "$TARGET_DIR"
fi

mkdir "$TARGET_DIR/css/"
mkdir "$TARGET_DIR/js/"
mkdir "$TARGET_DIR/img/"

# define license check function
check_license()
{
  filename=$1
  allowed_licenses=$2

  # find licenses line of this file
  LICENSES="`head $filename | grep -i 'Licenses\?:\|Licensed under'`"

  # make sure this line contains a compatible license
  match=0
  matching_license=""
  for license in $allowed_licenses; do
    if [ `echo $LICENSES | grep -c "\(\W\|\<\)$license\(\W\|\>\)"` -gt 0 ]; then
      match=1
      matching_license="$license"
    fi
    if [ $license == "MPL" -a `echo $LICENSES | grep -c "\(\W\|\<\)\(Mozilla Public License version 1.1\|MPLv2\)\(\W\|\>\)"` -gt 0 ]; then
      match=1
      matching_license="$license"
    fi
  done
  if [ $match -eq 0 ]; then
    echo >&2
    echo "ERROR: Could not detect a $LICENSE-compatible license for file '$filename'!" >&2
    rm -r -- "$TARGET_DIR"
    exit 1
  else
    echo "$filename detected to be licensed under the $LICENSE-compatible license $matching_license:"
    echo -en "\t"
    echo "$LICENSES"
  fi
}

# create compound javascript file
echo "$LICENSE_HEADER" > "$TARGET_DIR/js/mini.js"

JS_FILES="`cat xml/mini.xml | sed -n "s/.*<js>\(.*\)<\/js>.*/\1/p" | sed "s/~/ /g"`"
for js_file in $JS_FILES; do
  check_license "js/$js_file" "$COMPATIBLE_LICENSES"

  # add to compound file removing UTF-8 byte order mark
  cat "js/$js_file" | sed s/^\\xef\\xbb\\xbf// >> "$TARGET_DIR/js/mini.js"
done

# simple configuraton
cat >> "$TARGET_DIR/js/mini.js" << EOF

// Configuration
XML_LANG = 'en';
JAPPIX_VERSION = jQuery.trim('`cat VERSION`');
EOF

# create compound style sheet file
echo "$LICENSE_HEADER" > "$TARGET_DIR/css/mini.css"

CSS_FILES="`cat xml/mini.xml | sed -n "s/.*<css>\(.*\)<\/css>.*/\1/p" | sed "s/~/ /g"`"
for css_file in $CSS_FILES; do
  check_license "css/$css_file" "$COMPATIBLE_LICENSES"

  # add to compound file removing UTF-8 byte order mark
  cat "css/$css_file" | sed s/^\\xef\\xbb\\xbf// >> "$TARGET_DIR/css/mini.css"
done

# copy additional style sheets
check_license "css/mini-ie.css" "$COMPATIBLE_LICENSES"
echo "$LICENSE_HEADER" > "$TARGET_DIR/css/mini-ie.css"
cat "css/mini-ie.css" >> "$TARGET_DIR/css/mini-ie.css"

# copy artwork
# mini.png and mini.gif are licensed under CC-BY
mkdir -p "$TARGET_DIR/img/sprites/"
cp "img/sprites/mini.gif" "$TARGET_DIR/img/sprites/mini.gif"
cp "img/sprites/mini.png" "$TARGET_DIR/img/sprites/mini.png"

# copy blank.gif
mkdir -p "$TARGET_DIR/img/others/"
cp "img/others/blank.gif" "$TARGET_DIR/img/others/blank.gif"

# license information
cat > "$TARGET_DIR/COPYING" << EOF
Code
----

The code is licensed under the $LICENSE, as indicated in the source files.

Artwork
-------

The files img/sprites/mini.png and img/sprites/mini.gif were created by
Vanaryon and are dual-licensed under the Creative Commons Attribution 2.5
License and the Creative Commons Attribution 3.0 License.
They contain work from the FamFamFam Silk icon set by Mark James.

 * http://famfamfam.com/lab/icons/silk/
 * http://creativecommons.org/licenses/by/2.5/
 * http://creativecommons.org/licenses/by/3.0/
EOF
